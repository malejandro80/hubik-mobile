import { propertyDescribeInstruction } from '../_shared/prompts.ts';

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
  const location = [known.address, known.city].filter(Boolean).join(', ');

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
    const known: PropertyDraft = body?.known && typeof body.known === 'object' ? body.known : {};

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const hasGeminiKey = Boolean(geminiKey) && geminiKey !== 'your_gemini_api_key_here';
    const groqKey = Deno.env.get('GROQ_API_KEY');

    let description: string | undefined;

    // 1. Try Gemini
    if (hasGeminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Genera la descripción del anuncio.' }] }],
              systemInstruction: { parts: [{ text: propertyDescribeInstruction(known) }] },
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = text ? JSON.parse(text) : null;
          if (typeof parsed?.description === 'string' && parsed.description.trim()) {
            description = parsed.description.trim();
          }
        } else {
          console.warn('[property-describe] Gemini returned non-ok status:', geminiRes.status);
        }
      } catch (geminiErr) {
        console.warn('[property-describe] Gemini error:', geminiErr);
      }
    }

    // 2. Try Groq fallback if Gemini is rate-limited (e.g. 429) or unavailable
    if (!description && groqKey) {
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
                content: propertyDescribeInstruction(known),
              },
              {
                role: 'user',
                content: 'Genera la descripción del anuncio.',
              },
            ],
            max_tokens: 300,
            response_format: { type: 'json_object' },
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const content = groqData.choices?.[0]?.message?.content;
          const parsed = content ? JSON.parse(content) : null;
          if (typeof parsed?.description === 'string' && parsed.description.trim()) {
            description = parsed.description.trim();
          }
        } else {
          console.warn('[property-describe] Groq returned non-ok status:', groqRes.status);
        }
      } catch (groqErr) {
        console.warn('[property-describe] Groq error:', groqErr);
      }
    }

    // 3. Fallback to clean deterministic description if all external AI services fail
    if (!description) {
      description = generateFallbackDescription(known);
    }

    return new Response(
      JSON.stringify({ description }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [property-describe] Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'No se pudo generar la descripción' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
