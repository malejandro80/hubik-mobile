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
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  city?: string;
  address?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
}

function buildSystemInstruction(known: PropertyDraft): string {
  return (
    'Eres un redactor inmobiliario que escribe en español para Hubik. ' +
    `Estos son los ÚNICOS datos reales de la propiedad: ${JSON.stringify(known)}. ` +
    'Escribe una descripción breve (2 a 4 frases), cálida y profesional, para el anuncio. ' +
    'Usa EXCLUSIVAMENTE los datos proporcionados: nunca inventes amenidades, cercanías, ' +
    'reformas, vistas ni ningún hecho que no esté en esos datos. Si un dato no está presente, ' +
    'simplemente no lo menciones. Responde solo con un objeto JSON: { "description": "..." }.'
  );
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

    if (!hasGeminiKey) {
      return new Response(
        JSON.stringify({ error: 'La generación de descripciones requiere que Gemini esté configurado en el servidor' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Genera la descripción del anuncio.' }] }],
          systemInstruction: { parts: [{ text: buildSystemInstruction(known) }] },
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!geminiRes.ok) {
      throw new Error(`Gemini respondió con estado ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = text ? JSON.parse(text) : null;
    const description = typeof parsed?.description === 'string' ? parsed.description.trim() : '';

    if (!description) {
      throw new Error('Gemini no devolvió una descripción válida');
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
