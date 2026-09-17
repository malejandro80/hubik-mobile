import { createClient } from 'jsr:@supabase/supabase-js@2';
import { isAudioPayload, transcribeAndExtractFromAudio } from '../_shared/geminiAudio.ts';

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
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  city?: string;
  address?: string;
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

const DRAFT_CITIES = ['Austin', 'Miami', 'Denver', 'Seattle', 'New York', 'Madrid', 'Barcelona', 'Valencia', 'Sevilla'];

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
  const match = text.match(
    /(\d{1,3}(?:\.\d{3})+|\d{4,})(?:,\d+)?\s*(?:€|euros?|eur\b|\$|usd|dólares?|dolares?)/i
  );
  if (!match) return undefined;
  const val = parseInt(match[1].replace(/\./g, ''), 10);
  return Number.isNaN(val) ? undefined : val;
}

function extractCatastro(text: string): string | undefined {
  const match = text.match(/\b(?=[A-Za-z0-9]{14,20}\b)(?=[A-Za-z0-9]*[0-9])(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{14,20}\b/);
  return match ? match[0].toUpperCase() : undefined;
}

function heuristicExtract(message: string, known: PropertyDraft): PropertyDraft {
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

  for (const city of DRAFT_CITIES) {
    if (lower.includes(city.toLowerCase())) {
      extracted.city = city;
      break;
    }
  }

  return { ...known, ...extracted };
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
    return `${prefix}¡Perfecto! Ya tengo todos los datos necesarios. Aquí tiene el resumen para confirmar.`;
  }
  if (missing.includes('catastro')) {
    return 'Para comenzar, indíqueme la referencia catastral de la propiedad (puede consultarla en el recibo del IBI o en la Sede Electrónica del Catastro). La verificaré antes de continuar.';
  }
  const labels = missing.map((field) => FIELD_LABELS[field]);
  const joined =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
  return `${prefix}Me falta: ${joined}. Puede dármelos todos juntos o de a poco.`;
}

function buildPropertyAudioSystemInstruction(known: PropertyDraft): string {
  return (
    'Eres un asistente que ayuda a un propietario a registrar una vivienda en Hubik, conversando en español. ' +
    `Datos ya conocidos de esta propiedad (no los repitas salvo que la nota los corrija explícitamente): ${JSON.stringify(known)}. ` +
    'Primero transcribe fielmente la nota de voz del usuario (en español o inglés) en el campo "transcript". ' +
    'Luego, a partir de esa transcripción, extrae SOLO los campos que se mencionan explícita o claramente, como un objeto JSON con claves opcionales: ' +
    'catastro (string, la referencia catastral, normalmente un código alfanumérico de 14 a 20 caracteres), ' +
    'title (string), property_type (uno exacto de: Apartment, Single Family, Townhouse, Studio, Condo), ' +
    'operation_type (uno exacto de: sale, rent), price (number, en euros), bedrooms (number), bathrooms (number), ' +
    'square_meters (number), city (string), address (string, calle y número si se mencionan). ' +
    'No inventes valores que no estén en la nota. Genera únicamente JSON válido sin explicaciones adicionales.'
  );
}

function sanitizeGeminiFields(raw: any): Partial<PropertyDraft> {
  const clean: Partial<PropertyDraft> = {};
  if (!raw || typeof raw !== 'object') return clean;

  if (typeof raw.catastro === 'string' && raw.catastro.trim()) clean.catastro = raw.catastro.trim().toUpperCase();
  if (typeof raw.title === 'string' && raw.title.trim()) clean.title = raw.title.trim();
  if (PROPERTY_TYPES.includes(raw.property_type)) clean.property_type = raw.property_type;
  if (OPERATION_TYPES.includes(raw.operation_type)) clean.operation_type = raw.operation_type;
  if (typeof raw.price === 'number' && raw.price > 0) clean.price = raw.price;
  if (typeof raw.bedrooms === 'number' && raw.bedrooms >= 0) clean.bedrooms = raw.bedrooms;
  if (typeof raw.bathrooms === 'number' && raw.bathrooms >= 0) clean.bathrooms = raw.bathrooms;
  if (typeof raw.square_meters === 'number' && raw.square_meters > 0) clean.square_meters = raw.square_meters;
  if (typeof raw.city === 'string' && raw.city.trim()) clean.city = raw.city.trim();
  if (typeof raw.address === 'string' && raw.address.trim()) clean.address = raw.address.trim();

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

    let data: PropertyDraft = isAudioRequest ? { ...known } : heuristicExtract(message, known);
    let transcript: string | undefined;

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const hasGeminiKey = Boolean(geminiKey) && geminiKey !== 'your_gemini_api_key_here';

    if (isAudioRequest) {
      // Voice notes have no local text for the heuristic pass, and Gemini is the
      // only thing that can transcribe them - no fallback here.
      if (!hasGeminiKey) {
        return new Response(
          JSON.stringify({ error: 'Las notas de voz requieren que Gemini esté configurado en el servidor' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      try {
        const result = await transcribeAndExtractFromAudio(
          audio,
          buildPropertyAudioSystemInstruction(known),
          geminiKey!
        );
        transcript = result.transcript;
        data = { ...data, ...sanitizeGeminiFields(result.extracted) };
      } catch (geminiErr: any) {
        console.error('[property-intake] Gemini audio transcription error:', geminiErr);
        return new Response(
          JSON.stringify({ error: geminiErr?.message || 'No se pudo procesar la nota de voz' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (hasGeminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: message }] }],
              systemInstruction: {
                parts: [
                  {
                    text:
                      'Eres un asistente que ayuda a un propietario a registrar una vivienda en Hubik, conversando en español. ' +
                      `Datos ya conocidos de esta propiedad (no los repitas salvo que el mensaje los corrija explícitamente): ${JSON.stringify(known)}. ` +
                      'Extrae del mensaje del usuario SOLO los campos que se mencionan explícita o claramente en ese mensaje, como un objeto JSON con claves opcionales: ' +
                      'catastro (string, la referencia catastral, normalmente un código alfanumérico de 14 a 20 caracteres), ' +
                      'title (string), property_type (uno exacto de: Apartment, Single Family, Townhouse, Studio, Condo), ' +
                      'operation_type (uno exacto de: sale, rent), price (number, en euros), bedrooms (number), bathrooms (number), ' +
                      'square_meters (number), city (string), address (string, calle y número si se mencionan). ' +
                      'No inventes valores que no estén en el mensaje. Genera únicamente JSON válido sin explicaciones adicionales.',
                  },
                ],
              },
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = sanitizeGeminiFields(JSON.parse(text));
            data = { ...data, ...parsed };
          }
        }
      } catch (geminiErr) {
        console.warn('[property-intake] Gemini extraction error, using heuristic result:', geminiErr);
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
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey =
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
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
