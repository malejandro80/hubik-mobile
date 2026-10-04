import { createClient } from 'jsr:@supabase/supabase-js@2';
import { requireAgent } from '../_shared/auth.ts';
import { isAudioPayload } from '../_shared/audioPayload.ts';
import { extractAmenityKeywords, hasAmenitySignal, normalizeAmenities } from '../_shared/amenities.ts';
import { fetchKnownCities } from '../_shared/cities.ts';
import { matchCityInText } from '../_shared/cityMatch.ts';
import {
  GEMINI_EXTRACTION_MODEL,
  propertyIntakeAmenitiesOnlyInstruction,
  propertyIntakeTextInstruction,
} from '../_shared/prompts.ts';
import { transcribeAudio } from '../_shared/groqAudio.ts';
import { buildAssistantMessage, type IntakeField, pendingExtras } from '../_shared/intakeMessage.ts';
import { geminiGenerateJson } from '../_shared/geminiFacade.ts';
import { groqChatJson } from '../_shared/groqFacade.ts';
import { ErrorCode, handleErrorResponse } from '../_shared/errorFacade.ts';
import { extractCatastroSkip } from '../_shared/catastroSkip.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type PropertyType = 'Apartment' | 'Single Family' | 'Townhouse' | 'Studio' | 'Condo';
type OperationType = 'sale' | 'rent';

interface PropertyDraft {
  catastro?: string;
  catastro_skipped?: boolean;
  title?: string;
  property_type?: PropertyType;
  operation_type?: OperationType;
  price?: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  city?: string;
  address?: string;
  amenities?: string[];
}

const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'Single Family', 'Townhouse', 'Studio', 'Condo'];
const OPERATION_TYPES: OperationType[] = ['sale', 'rent'];

const REQUIRED_FIELDS: (keyof PropertyDraft)[] = [
  'catastro',
  'property_type',
  'operation_type',
  'price',
  'bedrooms',
  'bathrooms',
  'square_meters',
  'city',
  'address',
];

function extractPropertyType(lower: string): PropertyType | undefined {
  if (
    lower.includes('apartamento') ||
    lower.includes('departamento') ||
    lower.includes('piso') ||
    lower.includes('flat') ||
    lower.includes('apartment')
  ) {
    return 'Apartment';
  }
  if (lower.includes('condominio') || lower.includes('condo')) return 'Condo';
  if (lower.includes('adosada') || lower.includes('townhouse') || lower.includes('townhome')) return 'Townhouse';
  if (lower.includes('estudio') || lower.includes('monoambiente') || lower.includes('studio')) return 'Studio';
  if (
    lower.includes('casa') ||
    lower.includes('vivienda') ||
    lower.includes('chalet') ||
    lower.includes('house') ||
    lower.includes('single family')
  ) {
    return 'Single Family';
  }
  return undefined;
}

function extractOperationType(lower: string): OperationType | undefined {
  if (
    lower.includes('alquilar') ||
    lower.includes('alquiler') ||
    lower.includes('arriendo') ||
    lower.includes('renta') ||
    lower.includes('rentar') ||
    lower.includes('rent')
  ) {
    return 'rent';
  }
  if (lower.includes('vender') || lower.includes('vendo') || lower.includes('venta') || lower.includes('sale')) {
    return 'sale';
  }
  return undefined;
}

function extractPrice(text: string): number | undefined {
  const lower = text.toLowerCase();

  const milMatch = lower.match(
    /(?:(?:precio|valor|cuesta|por|en|pido)?\s*(?:es\s*(?:de\s*)?)?)?(?:\$|€)?\s*(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b(?:\s*(?:€|euros?|eur|\$|usd|dólares?|dolares?|pesos?))?/i
  );
  if (milMatch && milMatch[1]) {
    const rawNum = parseFloat(milMatch[1].replace(',', '.'));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      return Math.round(rawNum * 1000);
    }
  }

  const millonesMatch = lower.match(
    /(?:(?:precio|valor|cuesta|por|en|pido)?\s*(?:es\s*(?:de\s*)?)?)?(?:\$|€)?\s*(\d+(?:[.,]\d+)?)\s*(?:millones?|m)\b(?:\s*(?:€|euros?|eur|\$|usd|dólares?|dolares?|pesos?))?/i
  );
  if (millonesMatch && millonesMatch[1]) {
    const rawNum = parseFloat(millonesMatch[1].replace(',', '.'));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      return Math.round(rawNum * 1000000);
    }
  }

  const suffixMatch = lower.match(
    /(\d{1,3}(?:[.,]\d{3})+|\d{3,})(?:[.,]\d{1,2})?\s*(?:€|euros?|eur\b|\$|usd|dólares?|dolares?|pesos?)/i
  );
  if (suffixMatch) {
    const raw = suffixMatch[1].replace(/[.,]/g, '');
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  const prefixMatch = lower.match(/(?:[$€])\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})(?:[.,]\d{1,2})?/i);
  if (prefixMatch) {
    const raw = prefixMatch[1].replace(/[.,]/g, '');
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  const keywordMatch = lower.match(
    /(?:precio|valor|cuesta|pido)\s*(?:es\s*(?:de\s*)?|:\s*)?\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})/i
  );
  if (keywordMatch) {
    const raw = keywordMatch[1].replace(/[.,]/g, '');
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  return undefined;
}

function extractCatastro(text: string, alreadyProvided: boolean): string | undefined {
  const legacyMatch = text.match(/\bLEGACY-[A-Za-z0-9]{5,13}\b/i);
  if (legacyMatch) return legacyMatch[0].toUpperCase();

  const spacedMatch = text.match(
    /\b([A-Za-z0-9]{7}\s+[A-Za-z0-9]{7}\s+[A-Za-z0-9]{4}\s+[A-Za-z0-9]{2}|[A-Za-z0-9]{14}\s+[A-Za-z0-9]{4}\s+[A-Za-z0-9]{2})\b/
  );
  if (spacedMatch) return spacedMatch[0].replace(/\s+/g, '').toUpperCase();

  const hyphenGroupMatch = text.match(
    /\b([A-Za-z0-9]{7}-[A-Za-z0-9]{7}-[A-Za-z0-9]{4}-[A-Za-z0-9]{2}|[A-Za-z0-9]{14}-[A-Za-z0-9]{4}-[A-Za-z0-9]{2})\b/
  );
  if (hyphenGroupMatch) return hyphenGroupMatch[0].replace(/-/g, '').toUpperCase();

  const match = text.match(
    /\b(?=[A-Za-z0-9-]{14,20}\b)(?=[A-Za-z0-9-]*[0-9])(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9-]{14,20}\b/
  );
  if (match) return match[0].toUpperCase();

  const trimmed = text.trim();
  if (/^[A-Za-z0-9-]{14,20}$/.test(trimmed) && /[0-9]/.test(trimmed) && /[A-Za-z]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (!alreadyProvided && /^\S+$/.test(trimmed) && trimmed.length >= 4 && /[0-9]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return undefined;
}

function heuristicExtract(message: string, known: PropertyDraft, knownCities: string[]): PropertyDraft {
  const lower = message.toLowerCase();
  const extracted: PropertyDraft = {};

  const isOnlyCatastroRemaining =
    known.catastro === undefined &&
    !known.catastro_skipped &&
    REQUIRED_FIELDS.every((f) => f === 'catastro' || known[f] !== undefined);

  if (extractCatastroSkip(message, isOnlyCatastroRemaining)) {
    extracted.catastro_skipped = true;
  }

  const catastro = extractCatastro(message, known.catastro !== undefined);
  if (catastro) {
    extracted.catastro = catastro;
    extracted.catastro_skipped = false;
  }

  const propertyType = extractPropertyType(lower);
  if (propertyType) extracted.property_type = propertyType;

  const operationType = extractOperationType(lower);
  if (operationType) extracted.operation_type = operationType;

  const price = extractPrice(message);
  if (price !== undefined) extracted.price = price;

  const bedMatch = message.match(/(\d+)\s*hab\w*/i);
  if (bedMatch) extracted.bedrooms = parseInt(bedMatch[1], 10);

  const bathMatch = message.match(/(\d+(?:[.,]\d+)?)\s*ba[ñn]o\w*/i);
  if (bathMatch) extracted.bathrooms = parseFloat(bathMatch[1].replace(',', '.'));

  const areaMatch = message.match(/(\d+)\s*(?:m2|m²|metros(?:\s*cuadrados)?)/i);
  if (areaMatch) extracted.square_meters = parseInt(areaMatch[1], 10);

  const addressMatch = message.match(/calle\s+[^,.]+/i);
  if (addressMatch) extracted.address = addressMatch[0].trim();

  const city = matchCityInText(message, knownCities);
  if (city) extracted.city = city;

  return { ...known, ...extracted };
}

function sanitizeGeminiFields(raw: any): Partial<PropertyDraft> {
  const clean: Partial<PropertyDraft> = {};
  if (!raw || typeof raw !== 'object') return clean;

  if (typeof raw.catastro_skipped === 'boolean') clean.catastro_skipped = raw.catastro_skipped;
  if (typeof raw.catastro === 'string' && raw.catastro.trim()) clean.catastro = raw.catastro.trim().toUpperCase();
  if (typeof raw.title === 'string' && raw.title.trim()) clean.title = raw.title.trim();
  if (PROPERTY_TYPES.includes(raw.property_type)) clean.property_type = raw.property_type;
  if (OPERATION_TYPES.includes(raw.operation_type)) clean.operation_type = raw.operation_type;
  if (typeof raw.price === 'number' && raw.price > 0) clean.price = Math.round(raw.price);
  if (typeof raw.currency === 'string' && ['USD', 'VES', 'EUR'].includes(raw.currency.toUpperCase())) {
    clean.currency = raw.currency.toUpperCase();
  }
  if (typeof raw.bedrooms === 'number' && raw.bedrooms >= 0) clean.bedrooms = raw.bedrooms;
  if (typeof raw.bathrooms === 'number' && raw.bathrooms >= 0) clean.bathrooms = raw.bathrooms;
  if (typeof raw.square_meters === 'number' && raw.square_meters > 0) clean.square_meters = raw.square_meters;
  if (typeof raw.city === 'string' && raw.city.trim()) clean.city = raw.city.trim();
  if (typeof raw.address === 'string' && raw.address.trim()) clean.address = raw.address.trim();
  const amenities = normalizeAmenities(raw.amenities);
  if (amenities.length > 0) clean.amenities = amenities;

  return clean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestStart = Date.now();

  try {
    const identity = await requireAgent(req, corsHeaders);
    if (identity instanceof Response) return identity;

    const body = await req.json().catch(() => ({}));
    const message = body?.message;
    const audio = body?.audio;
    const known: PropertyDraft = body?.known && typeof body.known === 'object' ? body.known : {};
    const isAudioRequest = isAudioPayload(audio);

    if (!isAudioRequest && (!message || typeof message !== 'string' || message.trim() === '')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "message" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let transcript: string | undefined;
    let effectiveMessage: string;

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const hasGeminiKey = Boolean(geminiKey) && geminiKey !== 'your_gemini_api_key_here';
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (isAudioRequest) {
      if (!groqKey) {
        return new Response(
          JSON.stringify({ error: 'Las notas de voz requieren que Groq esté configurado en el servidor' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      try {
        transcript = await transcribeAudio(audio, groqKey);
        effectiveMessage = transcript;
      } catch (transcribeErr: unknown) {
        return handleErrorResponse(transcribeErr, {
          logTag: 'property-intake',
          corsHeaders,
          fallbackCode: ErrorCode.UPSTREAM_SERVICE_ERROR,
          fallbackMessage: 'No se pudo procesar la nota de voz',
        });
      }
    } else {
      effectiveMessage = message;
    }

    const knownCities = await fetchKnownCities(supabaseUrl, supabaseKey);
    let data: PropertyDraft = heuristicExtract(effectiveMessage, known, knownCities);

    const heuristicAmenityHits = extractAmenityKeywords(effectiveMessage);
    data.amenities = normalizeAmenities([...(data.amenities ?? []), ...heuristicAmenityHits]);

    const computeMissingFields = (current: PropertyDraft): (keyof PropertyDraft)[] =>
      REQUIRED_FIELDS.filter((field) => {
        if (field === 'catastro') {
          return !current.catastro && !current.catastro_skipped;
        }
        return current[field] === undefined;
      });

    const requiredMissing = computeMissingFields(data).length > 0;
    const amenitySignal = !requiredMissing && hasAmenitySignal(effectiveMessage);

    if (requiredMissing || amenitySignal) {
      let llmExtracted: Partial<PropertyDraft> | undefined;
      const instruction = requiredMissing
        ? propertyIntakeTextInstruction(known)
        : propertyIntakeAmenitiesOnlyInstruction(known);

      if (hasGeminiKey) {
        const parsed = await geminiGenerateJson<Record<string, unknown>>({
          model: GEMINI_EXTRACTION_MODEL,
          key: geminiKey,
          prompt: effectiveMessage,
          systemInstruction: instruction,
          logTag: 'property-intake',
        });
        if (parsed) {
          llmExtracted = sanitizeGeminiFields(parsed);
        }
      }

      if (!llmExtracted && groqKey) {
        const parsed = await groqChatJson<Record<string, unknown>>({
          key: groqKey,
          model: 'qwen/qwen3.8-27b',
          systemInstruction: instruction,
          userPrompt: effectiveMessage,
          maxTokens: 500,
          logTag: 'property-intake',
        });
        if (parsed) {
          llmExtracted = sanitizeGeminiFields(parsed);
        }
      }

      if (llmExtracted) {
        const { amenities: llmAmenities, ...rest } = llmExtracted;
        data = { ...data, ...rest };
        if (llmAmenities && llmAmenities.length > 0) {
          data.amenities = normalizeAmenities([...(data.amenities ?? []), ...llmAmenities]);
        }
      }
    }

    let catastroStatus: 'verified' | 'unverified' | undefined;
    if (data.catastro && data.catastro !== known.catastro) {
      try {
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: existing } = await supabase
            .from('properties')
            .select('id')
            .eq('catastro', data.catastro)
            .limit(1)
            .maybeSingle();

          if (existing) {
            data = { ...data, catastro: undefined };
            const missing_fields = computeMissingFields(data);
            return new Response(
              JSON.stringify({
                data,
                missing_fields,
                assistant_message:
                  'Esa referencia catastral ya está registrada en Hubik. Por favor verifique el número o indique uno diferente.',
                ready_to_confirm: false,
                ...(transcript ? { transcript } : {}),
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          catastroStatus = 'verified';
        } else {
          catastroStatus = 'unverified';
        }
      } catch {
        catastroStatus = 'unverified';
      }
    }

    const missing_fields = computeMissingFields(data);
    const ready_to_confirm = missing_fields.length === 0;

    return new Response(
      JSON.stringify({
        data,
        missing_fields,
        assistant_message: buildAssistantMessage(
          missing_fields as IntakeField[],
          catastroStatus,
          undefined,
          pendingExtras(known)
        ),
        ready_to_confirm,
        ...(transcript ? { transcript } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    return handleErrorResponse(error, {
      logTag: 'property-intake',
      corsHeaders,
      fallbackCode: ErrorCode.INTERNAL_SERVER_ERROR,
      fallbackMessage: 'Internal error in property-intake Edge Function',
    });
  }
});
