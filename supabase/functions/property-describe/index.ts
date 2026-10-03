import { describableFacts } from '../_shared/describeFacts.ts';
import { propertyDescribeInstruction } from '../_shared/prompts.ts';
import { geminiGenerateJson } from '../_shared/geminiFacade.ts';
import { groqChatJson } from '../_shared/groqFacade.ts';
import { ErrorCode, handleErrorResponse } from '../_shared/errorFacade.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface PropertyDraft {
  catastro?: string;
  title?: string;
  property_type?: string;
  operation_type?: string;
  price?: number;
  currency?: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  city?: string;
  address?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  amenities?: string[];
}

function generateFallbackDescription(known: PropertyDraft): string {
  const typeMap: Record<string, string> = {
    Apartment: 'apartamento',
    'Single Family': 'casa',
    Townhouse: 'casa adosada',
    Studio: 'estudio',
    Condo: 'condominio',
  };
  const typeLabel = (known.property_type && typeMap[known.property_type]) || 'propiedad';
  const opLabel = known.operation_type === 'rent' ? 'en alquiler' : 'en venta';
  const location = known.city ?? '';

  const features: string[] = [];
  if (known.bedrooms) features.push(`${known.bedrooms} habitaciones`);
  if (known.bathrooms) features.push(`${known.bathrooms} baños`);
  if (known.square_meters) features.push(`${known.square_meters} m²`);
  const featuresStr = features.length > 0 ? ` Distribuida en ${features.join(', ')}.` : '';
  const amenitiesStr =
    known.amenities && known.amenities.length > 0 ? ` Cuenta con ${known.amenities.join(', ')}.` : '';

  const priceFormatted = known.price ? known.price.toLocaleString('es-ES') : '';
  const currencyStr = known.currency === 'USD' ? 'USD' : known.currency === 'VES' ? 'Bs.' : '€';
  const priceStr = priceFormatted ? ` Precio: ${priceFormatted} ${currencyStr}.` : '';

  return `Excelente oportunidad de ${typeLabel} ${opLabel}${location ? ` ubicada en ${location}` : ''}.${featuresStr}${amenitiesStr}${priceStr} Lista para habitar con excelente distribución.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const known: PropertyDraft = describableFacts(
      body?.known && typeof body.known === 'object' ? body.known : {}
    );

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const hasGeminiKey = Boolean(geminiKey) && geminiKey !== 'your_gemini_api_key_here';
    const groqKey = Deno.env.get('GROQ_API_KEY');

    let description: string | undefined;

    if (hasGeminiKey) {
      const parsed = await geminiGenerateJson<{ description?: string }>({
        model: 'gemini-2.5-flash',
        key: geminiKey,
        prompt: 'Genera la descripción del anuncio.',
        systemInstruction: propertyDescribeInstruction(known),
        logTag: 'property-describe',
      });
      if (typeof parsed?.description === 'string' && parsed.description.trim()) {
        description = parsed.description.trim();
      }
    }

    if (!description && groqKey) {
      const parsed = await groqChatJson<{ description?: string }>({
        key: groqKey,
        model: 'qwen/qwen3.8-27b',
        systemInstruction: propertyDescribeInstruction(known),
        userPrompt: 'Genera la descripción del anuncio.',
        maxTokens: 300,
        logTag: 'property-describe',
      });
      if (typeof parsed?.description === 'string' && parsed.description.trim()) {
        description = parsed.description.trim();
      }
    }

    if (!description) {
      description = generateFallbackDescription(known);
    }

    return new Response(
      JSON.stringify({ description }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    return handleErrorResponse(error, {
      logTag: 'property-describe',
      corsHeaders,
      fallbackCode: ErrorCode.UPSTREAM_SERVICE_ERROR,
      fallbackMessage: 'No se pudo generar la descripción',
    });
  }
});
