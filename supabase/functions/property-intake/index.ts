import { createClient } from 'jsr:@supabase/supabase-js@2';
import { isAudioPayload } from '../_shared/audioPayload.ts';
import { extractAmenityKeywords, hasAmenitySignal, normalizeAmenities } from '../_shared/amenities.ts';
import { fetchKnownCities, matchCityInText } from '../_shared/cities.ts';
import {
  GEMINI_EXTRACTION_MODEL,
  propertyIntakeAmenitiesOnlyInstruction,
  propertyIntakeTextInstruction,
} from '../_shared/prompts.ts';
import { transcribeAudio } from '../_shared/groqAudio.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type PropertyType = 'Apartment' | 'Single Family' | 'Townhouse' | 'Studio' | 'Condo';
type OperationType = 'sale' | 'rent';

interface PropertyDraft {
  catastro?: string;
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

const FIELD_LABELS: Record<keyof PropertyDraft, string> = {
  catastro: 'referencia catastral',
  title: 'título',
  property_type: 'tipo de propiedad',
  operation_type: 'si es venta o alquiler',
  price: 'precio',
  bedrooms: 'habitaciones',
  bathrooms: 'baños',
  square_meters: 'metros cuadrados',
  city: 'ciudad',
  address: 'dirección',
};

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

  // 1. "80 mil", "80mil", "80 k", "80k" with optional currency (e.g. "80 mil dólares", "$80 mil", "80k €")
  const milMatch = lower.match(
    /(?:(?:precio|valor|cuesta|por|en|pido)?\s*(?:es\s*(?:de\s*)?)?)?(?:\$|€)?\s*(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b(?:\s*(?:€|euros?|eur|\$|usd|dólares?|dolares?|pesos?))?/i
  );
  if (milMatch && milMatch[1]) {
    const rawNum = parseFloat(milMatch[1].replace(',', '.'));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      return Math.round(rawNum * 1000);
    }
  }

  // 2. "80 millones" (e.g. LatAm)
  const millonesMatch = lower.match(
    /(?:(?:precio|valor|cuesta|por|en|pido)?\s*(?:es\s*(?:de\s*)?)?)?(?:\$|€)?\s*(\d+(?:[.,]\d+)?)\s*(?:millones?|m)\b(?:\s*(?:€|euros?|eur|\$|usd|dólares?|dolares?|pesos?))?/i
  );
  if (millonesMatch && millonesMatch[1]) {
    const rawNum = parseFloat(millonesMatch[1].replace(',', '.'));
    if (!Number.isNaN(rawNum) && rawNum > 0) {
      return Math.round(rawNum * 1000000);
    }
  }

  // 3. Number with explicit currency suffix (e.g. "420.000 euros", "80,000 $", "80000 eur")
  const suffixMatch = lower.match(
    /(\d{1,3}(?:[.,]\d{3})+|\d{3,})(?:[.,]\d{1,2})?\s*(?:€|euros?|eur\b|\$|usd|dólares?|dolares?|pesos?)/i
  );
  if (suffixMatch) {
    const raw = suffixMatch[1].replace(/[.,]/g, '');
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  // 4. Number with explicit currency prefix (e.g. "$420,000", "€80.000")
  const prefixMatch = lower.match(/(?:[$€])\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})(?:[.,]\d{1,2})?/i);
  if (prefixMatch) {
    const raw = prefixMatch[1].replace(/[.,]/g, '');
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  // 5. Keyword preceded price (e.g. "precio es de 420000", "precio: 80000", "cuesta 95000")
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

function extractCatastro(text: string): string | undefined {
  // 1. Match legacy/seeded references generated during migrations (e.g. LEGACY-E1F2A3B479302)
  const legacyMatch = text.match(/\bLEGACY-[A-Za-z0-9]{5,13}\b/i);
  if (legacyMatch) return legacyMatch[0].toUpperCase();

  // 2. Match standard Spanish cadastral references (14-20 alphanumeric characters, possibly with hyphens)
  const match = text.match(
    /\b(?=[A-Za-z0-9-]{14,20}\b)(?=[A-Za-z0-9-]*[0-9])(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9-]{14,20}\b/
  );
  if (match) return match[0].toUpperCase();

  // 3. Match user pasting the reference directly (with optional surrounding whitespace)
  const trimmed = text.trim();
  if (/^[A-Za-z0-9-]{14,20}$/.test(trimmed) && /[0-9]/.test(trimmed) && /[A-Za-z]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // 4. Match cadastral reference formatted with spaces (e.g. "9872023 VH5797S 0001 WX" or "9872023VH5797S 0001 WX")
  const spacedMatch = text.match(
    /\b([A-Za-z0-9]{7}\s+[A-Za-z0-9]{7}\s+[A-Za-z0-9]{4}\s+[A-Za-z0-9]{2}|[A-Za-z0-9]{14}\s+[A-Za-z0-9]{4}\s+[A-Za-z0-9]{2})\b/
  );
  if (spacedMatch) {
    return spacedMatch[0].replace(/\s+/g, '').toUpperCase();
  }

  return undefined;
}

function heuristicExtract(message: string, known: PropertyDraft, knownCities: string[]): PropertyDraft {
  const lower = message.toLowerCase();
  const extracted: PropertyDraft = {};

  const catastro = extractCatastro(message);
  if (catastro) extracted.catastro = catastro;

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

// Several phrasings per scenario, picked at random, so the assistant doesn't repeat the exact
// same sentence on every turn - purely cosmetic variety, the underlying data/logic is unchanged.
const READY_TO_CONFIRM_VARIANTS = [
  '¡Perfecto! Ya tengo todos los datos necesarios. Aquí tiene el resumen para confirmar.',
  '¡Listo! Con esto ya completé todos los datos. Revise el resumen y confírmelo cuando guste.',
  'Excelente, ya reuní todo lo necesario. Eche un vistazo al resumen antes de publicar.',
];

const MISSING_FIELDS_PREFIX_VARIANTS = ['Me falta: ', 'Aún necesito: ', 'Todavía me falta: '];
const MISSING_FIELDS_SUFFIX_VARIANTS = [
  'Puede dármelos todos juntos o de a poco.',
  'Puede indicármelos todos de una vez o uno a la vez.',
  'Cuando guste, dígamelos juntos o por partes.',
];

const CATASTRO_ASK_VARIANTS = [
  'Para comenzar, indíqueme la referencia catastral de la propiedad (puede consultarla en el recibo del IBI o en la Sede Electrónica del Catastro). La verificaré antes de continuar.',
  'Empecemos por la referencia catastral de la propiedad (está en el recibo del IBI o en la Sede Electrónica del Catastro). La verificaré antes de seguir.',
  'Lo primero que necesito es la referencia catastral (puede encontrarla en el recibo del IBI o en la Sede Electrónica del Catastro). Enseguida la verifico.',
];

function pick(variants: string[]): string {
  return variants[Math.floor(Math.random() * variants.length)];
}

function buildAssistantMessage(
  missing: (keyof PropertyDraft)[],
  catastroStatus?: 'verified' | 'unverified'
): string {
  const prefix =
    catastroStatus === 'verified'
      ? '✅ Referencia catastral verificada: no está duplicada.\n\n'
      : catastroStatus === 'unverified'
        ? 'Referencia catastral registrada. La verificaré de nuevo antes de publicar.\n\n'
        : '';

  if (missing.length === 0) {
    return `${prefix}${pick(READY_TO_CONFIRM_VARIANTS)}`;
  }
  if (missing.includes('catastro')) {
    return pick(CATASTRO_ASK_VARIANTS);
  }
  const labels = missing.map((field) => FIELD_LABELS[field]);
  const joined =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
  return `${prefix}${pick(MISSING_FIELDS_PREFIX_VARIANTS)}${joined}. ${pick(MISSING_FIELDS_SUFFIX_VARIANTS)}`;
}

function sanitizeGeminiFields(raw: any): Partial<PropertyDraft> {
  const clean: Partial<PropertyDraft> = {};
  if (!raw || typeof raw !== 'object') return clean;

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

  try {
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
      // Voice notes have no local text for the heuristic pass until transcribed. Deliberately no
      // Gemini fallback here (RFC 009) - see chat-query's matching comment.
      if (!groqKey) {
        return new Response(
          JSON.stringify({ error: 'Las notas de voz requieren que Groq esté configurado en el servidor' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      try {
        transcript = await transcribeAudio(audio, groqKey);
        effectiveMessage = transcript;
      } catch (transcribeErr: any) {
        console.error('[property-intake] Groq audio transcription error:', transcribeErr);
        return new Response(
          JSON.stringify({ error: transcribeErr?.message || 'No se pudo procesar la nota de voz' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      effectiveMessage = message;
    }

    // Cheap tier: the local heuristic runs first regardless of audio/text origin, same as
    // chat-query, matching cities against whatever is already in `properties.city` (any region,
    // no hardcoded list). Only escalate to Gemini when a required field is still missing
    // afterwards - bulk descriptions the heuristic already fully resolves skip the extra call.
    const knownCities = await fetchKnownCities(supabaseUrl, supabaseKey);
    let data: PropertyDraft = heuristicExtract(effectiveMessage, known, knownCities);

    const heuristicAmenityHits = extractAmenityKeywords(effectiveMessage);
    data.amenities = normalizeAmenities([...(data.amenities ?? []), ...heuristicAmenityHits]);

    const requiredMissing = REQUIRED_FIELDS.some((field) => data[field] === undefined);
    const amenitySignal = !requiredMissing && hasAmenitySignal(effectiveMessage);

    if (requiredMissing || amenitySignal) {
      let llmExtracted: Partial<PropertyDraft> | undefined;
      const instruction = requiredMissing
        ? propertyIntakeTextInstruction(known)
        : propertyIntakeAmenitiesOnlyInstruction(known);

      // 1. Try Gemini
      if (hasGeminiKey) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EXTRACTION_MODEL}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: effectiveMessage }] }],
                systemInstruction: {
                  parts: [{ text: instruction }],
                },
                generationConfig: { responseMimeType: 'application/json' },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              llmExtracted = sanitizeGeminiFields(JSON.parse(text));
            }
          } else {
            console.warn('[property-intake] Gemini extraction returned status:', geminiRes.status);
          }
        } catch (geminiErr) {
          console.warn('[property-intake] Gemini extraction error:', geminiErr);
        }
      }

      // 2. Resilient fallback to Groq LLM if Gemini is rate-limited or fails
      if (!llmExtracted && groqKey) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'qwen/qwen3.8-27b',
              messages: [
                {
                  role: 'system',
                  content: instruction,
                },
                {
                  role: 'user',
                  content: effectiveMessage,
                },
              ],
              max_tokens: 500,
              response_format: { type: 'json_object' },
            }),
          });

          if (groqRes.ok) {
            const groqData = await groqRes.json();
            const content = groqData.choices?.[0]?.message?.content;
            if (content) {
              llmExtracted = sanitizeGeminiFields(JSON.parse(content));
            }
          } else {
            console.warn('[property-intake] Groq LLM extraction returned status:', groqRes.status);
          }
        } catch (groqErr) {
          console.warn('[property-intake] Groq LLM extraction error:', groqErr);
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

    // First-step guard: if a catastro was just supplied (differs from what was already
    // known on the draft), check it isn't already registered before accepting it, and
    // give the user immediate feedback about that check either way. This lookup is
    // advisory only - property-publish and the DB's UNIQUE constraint are the real
    // enforcement point - so a lookup failure here fails open rather than blocking intake.
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
            const missing_fields = REQUIRED_FIELDS.filter((field) => data[field] === undefined);
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
      } catch (lookupErr) {
        console.warn('[property-intake] catastro uniqueness lookup failed, continuing:', lookupErr);
        catastroStatus = 'unverified';
      }
    }

    const missing_fields = REQUIRED_FIELDS.filter((field) => data[field] === undefined);
    const ready_to_confirm = missing_fields.length === 0;

    return new Response(
      JSON.stringify({
        data,
        missing_fields,
        assistant_message: buildAssistantMessage(missing_fields, catastroStatus),
        ready_to_confirm,
        ...(transcript ? { transcript } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [property-intake] Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error in property-intake Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
