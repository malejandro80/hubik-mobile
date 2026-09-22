import { createClient } from 'jsr:@supabase/supabase-js@2';
import { requireAgent } from '../_shared/auth.ts';
import { isAudioPayload } from '../_shared/audioPayload.ts';
import { extractAmenityKeywords, hasAmenitySignal, normalizeAmenities } from '../_shared/amenities.ts';
import { fetchKnownCities, matchCityInText } from '../_shared/cities.ts';
import {
  GEMINI_EXTRACTION_MODEL,
  propertyIntakeAmenitiesOnlyInstruction,
  propertyIntakeTextInstruction,
} from '../_shared/prompts.ts';
import { transcribeAudio } from '../_shared/groqAudio.ts';
import { buildAssistantMessage, type IntakeField } from '../_shared/intakeMessage.ts';

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

function extractCatastro(text: string, alreadyProvided: boolean): string | undefined {
  // 1. Match legacy/seeded references generated during migrations (e.g. LEGACY-E1F2A3B479302)
  const legacyMatch = text.match(/\bLEGACY-[A-Za-z0-9]{5,13}\b/i);
  if (legacyMatch) return legacyMatch[0].toUpperCase();

  // 2. Match the official grouping (7-7-4-2 or 14-4-2), space-separated (e.g. "9872023 VH5797S
  // 0001 WX"). Checked before the loose continuous pattern below: that pattern's character
  // class includes hyphens, so on a full 4-group hyphenated reference it would otherwise grab
  // an incomplete 14-20 char slice instead of the whole code.
  const spacedMatch = text.match(
    /\b([A-Za-z0-9]{7}\s+[A-Za-z0-9]{7}\s+[A-Za-z0-9]{4}\s+[A-Za-z0-9]{2}|[A-Za-z0-9]{14}\s+[A-Za-z0-9]{4}\s+[A-Za-z0-9]{2})\b/
  );
  if (spacedMatch) return spacedMatch[0].replace(/\s+/g, '').toUpperCase();

  // 3. Same grouping with hyphens instead of spaces (e.g. "9872023-VH5797S-0001-WX") - a
  // natural way to type a long code.
  const hyphenGroupMatch = text.match(
    /\b([A-Za-z0-9]{7}-[A-Za-z0-9]{7}-[A-Za-z0-9]{4}-[A-Za-z0-9]{2}|[A-Za-z0-9]{14}-[A-Za-z0-9]{4}-[A-Za-z0-9]{2})\b/
  );
  if (hyphenGroupMatch) return hyphenGroupMatch[0].replace(/-/g, '').toUpperCase();

  // 4. Match standard Spanish cadastral references (14-20 alphanumeric characters, possibly with hyphens)
  const match = text.match(
    /\b(?=[A-Za-z0-9-]{14,20}\b)(?=[A-Za-z0-9-]*[0-9])(?=[A-Za-z0-9-]*[A-Za-z])[A-Za-z0-9-]{14,20}\b/
  );
  if (match) return match[0].toUpperCase();

  // 5. Match user pasting the reference directly (with optional surrounding whitespace)
  const trimmed = text.trim();
  if (/^[A-Za-z0-9-]{14,20}$/.test(trimmed) && /[0-9]/.test(trimmed) && /[A-Za-z]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // 6. RFC 006 only requires a non-empty string for catastro (format/checksum validation
  // against the real cadastre is explicitly out of scope). While it's still the field being
  // collected, a single whitespace-free reply with a digit in it is almost certainly the user
  // answering directly, even when it doesn't match the shapes above (test/dummy values,
  // shorter internal references, etc). Gated to before catastro is already known so it can't
  // misfire on a later single-word answer (bedroom count, m2, ...), and requires a digit so
  // plain replies like "gracias" or "hola" aren't mistaken for a reference.
  if (!alreadyProvided && /^\S+$/.test(trimmed) && trimmed.length >= 4 && /[0-9]/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return undefined;
}

function heuristicExtract(message: string, known: PropertyDraft, knownCities: string[]): PropertyDraft {
  const lower = message.toLowerCase();
  const extracted: PropertyDraft = {};

  const catastro = extractCatastro(message, known.catastro !== undefined);
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
      // Voice notes have no local text for the heuristic pass until transcribed. Deliberately no
      // Gemini fallback here (RFC 009) - see chat-query's matching comment.
      if (!groqKey) {
        return new Response(
          JSON.stringify({ error: 'Las notas de voz requieren que Groq esté configurado en el servidor' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Logged before transcription starts, not after: this line alone proves the request body
      // (base64 audio) made it all the way to the Edge Function. When a voice note fails on the
      // client with "Failed to send a request to the Edge Function" (a transport-level failure,
      // not an HTTP error response), checking for this line at the reported time tells us whether
      // the request ever arrived here at all, or died in transit before reaching Supabase.
      console.log(`[property-intake] audio request received, base64 length: ${audio.data.length}`);
      const transcribeStart = Date.now();
      try {
        transcript = await transcribeAudio(audio, groqKey);
        effectiveMessage = transcript;
        console.log(`[property-intake] transcription completed in ${Date.now() - transcribeStart}ms`);
      } catch (transcribeErr: any) {
        console.error(
          `[property-intake] Groq audio transcription error after ${Date.now() - transcribeStart}ms:`,
          transcribeErr
        );
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
      const llmStart = Date.now();
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
      console.log(
        `[property-intake] LLM escalation completed in ${Date.now() - llmStart}ms (${llmExtracted ? 'hit' : 'miss'})`
      );
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
            console.log(`[property-intake] request completed in ${Date.now() - requestStart}ms (duplicate catastro)`);
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

    console.log(
      `[property-intake] request completed in ${Date.now() - requestStart}ms (${isAudioRequest ? 'audio' : 'text'})`
    );

    return new Response(
      JSON.stringify({
        data,
        missing_fields,
        assistant_message: buildAssistantMessage(missing_fields as IntakeField[], catastroStatus),
        ready_to_confirm,
        ...(transcript ? { transcript } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`❌ [property-intake] Edge Function error after ${Date.now() - requestStart}ms:`, error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error in property-intake Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
