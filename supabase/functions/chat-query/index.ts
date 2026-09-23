import { createClient } from 'jsr:@supabase/supabase-js@2';
import { isAudioPayload } from '../_shared/audioPayload.ts';
import { extractAmenityKeywords } from '../_shared/amenities.ts';
import { fetchKnownCities, matchCityInText } from '../_shared/cities.ts';
import { embedText } from '../_shared/geminiEmbedding.ts';
import { buildHybridSearch } from '../_shared/hybridSearch.ts';
import { composeSearchAnswer } from '../_shared/searchAnswer.ts';
import { chatQueryTextInstruction, GEMINI_EXTRACTION_MODEL } from '../_shared/prompts.ts';
import { transcribeAudio } from '../_shared/groqAudio.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface FilterParams {
  city?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_square_meters?: number;
  max_square_meters?: number;
  limit?: number;
  sort_by?: string;
  status?: string;
  amenities?: string[];
}

function parsePromptFilters(message: string, knownCities: string[]): FilterParams {
  const lower = message.toLowerCase();
  const filters: FilterParams = {};

  const city = matchCityInText(message, knownCities);
  if (city) filters.city = city;

  const amenityHits = extractAmenityKeywords(message);
  if (amenityHits.length > 0) filters.amenities = amenityHits;

  if (
    lower.includes('apartment') ||
    lower.includes('flat') ||
    lower.includes('apartamento') ||
    lower.includes('departamento') ||
    lower.includes('piso')
  ) {
    filters.property_type = 'Apartment';
  } else if (lower.includes('condo') || lower.includes('condominio')) {
    filters.property_type = 'Condo';
  } else if (
    lower.includes('townhouse') ||
    lower.includes('townhome') ||
    lower.includes('casa adosada')
  ) {
    filters.property_type = 'Townhouse';
  } else if (
    lower.includes('studio') ||
    lower.includes('estudio') ||
    lower.includes('monoambiente') ||
    lower.includes('microestudio')
  ) {
    filters.property_type = 'Studio';
  } else if (
    lower.includes('house') ||
    lower.includes('single family') ||
    lower.includes('home') ||
    lower.includes('casa') ||
    lower.includes('vivienda') ||
    lower.includes('chalet')
  ) {
    filters.property_type = 'Single Family';
  }

  const maxPriceMatch = lower.match(
    /(?:under|below|less than|<|max|menos de|menor a|hasta|máximo|maximo|bajo|debajo de)\s*\$?(\d+(?:k|,\d{3}|\.000)?)\b(?!\s*(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft|bed|br|hab|dorm|cuart|recám))/i
  );
  if (maxPriceMatch) {
    const raw = maxPriceMatch[1].toLowerCase();
    let val = parseInt(raw.replace(/[k,]/g, ''), 10);
    if (raw.includes('k')) val *= 1000;
    filters.max_price = val;
  }

  const minPriceMatch = lower.match(
    /(?:above|over|more than|>|min|más de|mas de|mayor a|desde|mínimo|minimo|sobre|arriba de)\s*\$?(\d+(?:k|,\d{3}|\.000)?)\b(?!\s*(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft|bed|br|hab|dorm|cuart|recám))/i
  );
  if (minPriceMatch) {
    const raw = minPriceMatch[1].toLowerCase();
    let val = parseInt(raw.replace(/[k,]/g, ''), 10);
    if (raw.includes('k')) val *= 1000;
    filters.min_price = val;
  }

  const bedMatch = lower.match(
    /(\d+)\s*(?:-| )?(?:bed|bedroom|br|habitación|habitaciones|hab|dormitorio|dormitorios|cuarto|cuartos|recámara|recámaras)/i
  );
  if (bedMatch) {
    filters.min_bedrooms = parseInt(bedMatch[1], 10);
  }

  const maxAreaMatch = lower.match(
    /(?:less than|less|under|below|<|max|menos de|menor a|hasta|máximo|maximo|debajo de)\s*(\d+)\s*(?:square meters|square metres|metros cuadrados|metros|m2|m²|sqm|sq m|square feet|square feets|sqft|sq ft|sq\.ft)?/i
  );
  if (
    maxAreaMatch &&
    (lower.includes('m2') ||
      lower.includes('m²') ||
      lower.includes('sqm') ||
      lower.includes('sq m') ||
      lower.includes('meter') ||
      lower.includes('metre') ||
      lower.includes('metro') ||
      lower.includes('square') ||
      lower.includes('sqft') ||
      lower.includes('sq ft'))
  ) {
    let val = parseInt(maxAreaMatch[1], 10);
    if (
      lower.includes('sqft') ||
      lower.includes('sq ft') ||
      lower.includes('square feet') ||
      lower.includes('feet')
    ) {
      val = Math.round(val * 0.092903);
    }
    filters.max_square_meters = val;
  }

  const minAreaMatch = lower.match(
    /(?:more than|over|above|>|min|más de|mas de|mayor a|desde|mínimo|minimo|arriba de)\s*(\d+)\s*(?:square meters|square metres|metros cuadrados|metros|m2|m²|sqm|sq m|square feet|square feets|sqft|sq ft|sq\.ft)?/i
  );
  if (
    minAreaMatch &&
    (lower.includes('m2') ||
      lower.includes('m²') ||
      lower.includes('sqm') ||
      lower.includes('sq m') ||
      lower.includes('meter') ||
      lower.includes('metre') ||
      lower.includes('metro') ||
      lower.includes('square') ||
      lower.includes('sqft') ||
      lower.includes('sq ft'))
  ) {
    let val = parseInt(minAreaMatch[1], 10);
    if (
      lower.includes('sqft') ||
      lower.includes('sq ft') ||
      lower.includes('square feet') ||
      lower.includes('feet')
    ) {
      val = Math.round(val * 0.092903);
    }
    filters.min_square_meters = val;
  }

  const limitMatch = lower.match(
    /(?:give|show|find|list|top|dame|muestra|mostrar|busca|buscar|encuentra|primeras|primeros)\s*(?:me\s*)?(\d+)/i
  );
  if (limitMatch) {
    filters.limit = parseInt(limitMatch[1], 10);
  }

  if (
    lower.includes('cheapest') ||
    lower.includes('lowest price') ||
    lower.includes('más barato') ||
    lower.includes('mas barato') ||
    lower.includes('más barata') ||
    lower.includes('mas barata') ||
    lower.includes('más económico') ||
    lower.includes('mas economico') ||
    lower.includes('más económica') ||
    lower.includes('mas economica') ||
    lower.includes('menor precio')
  ) {
    filters.sort_by = 'price_asc';
  } else if (
    lower.includes('most expensive') ||
    lower.includes('highest price') ||
    lower.includes('luxury') ||
    lower.includes('más caro') ||
    lower.includes('mas caro') ||
    lower.includes('más cara') ||
    lower.includes('mas cara') ||
    lower.includes('más costoso') ||
    lower.includes('mas costoso') ||
    lower.includes('más costosa') ||
    lower.includes('mas costosa') ||
    lower.includes('mayor precio') ||
    lower.includes('lujo') ||
    lower.includes('lujoso') ||
    lower.includes('lujosa')
  ) {
    filters.sort_by = 'price_desc';
  }

  return filters;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestStart = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const message = body?.message;
    const audio = body?.audio;
    const isAudioRequest = isAudioPayload(audio);

    if (!isAudioRequest && (!message || typeof message !== 'string' || message.trim() === '')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "message" parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_ANON_KEY') ??
      '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured in Edge Function');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const callerAuthHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? supabaseKey;
    const callerSupabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: callerAuthHeader ? { Authorization: callerAuthHeader } : {},
      },
    });

    // 1. Resolve the message: transcribe-only for audio (no field extraction in that call),
    // then run text and audio through the exact same cascade from here on.
    let transcript: string | undefined;
    let effectiveMessage: string;

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const hasGeminiKey = Boolean(geminiKey) && geminiKey !== 'your_gemini_api_key_here';

    const groqKey = Deno.env.get('GROQ_API_KEY');

    if (isAudioRequest) {
      // Voice notes have no local text to run the regex heuristic against until transcribed.
      // Deliberately no Gemini fallback here (RFC 009) - a fallback would silently reintroduce
      // the free-tier quota ceiling this migration exists to get away from.
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
      console.log(`[chat-query] audio request received, base64 length: ${audio.data.length}`);
      const transcribeStart = Date.now();
      try {
        transcript = await transcribeAudio(audio, groqKey);
        effectiveMessage = transcript;
        console.log(`[chat-query] transcription completed in ${Date.now() - transcribeStart}ms`);
        if (body?.transcribe_only === true) {
          return new Response(JSON.stringify({ transcript }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (transcribeErr: any) {
        console.error(
          `[chat-query] Groq audio transcription error after ${Date.now() - transcribeStart}ms:`,
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

    // 1b. Cheap tier: the local heuristic against known cities (derived from what's actually in
    // `properties.city` - any region, not a hardcoded list), zero tokens, ~2ms.
    const knownCities = await fetchKnownCities(supabaseUrl, supabaseKey);
    let filters: FilterParams = parsePromptFilters(effectiveMessage, knownCities);

    // 1c. Escalate to Gemini when the heuristic came back empty, OR when it found something but
    // no city - city is the single most determinant filter for the user, and a query that
    // mentions a type/price/etc. alongside a city the heuristic doesn't recognize (a brand-new
    // city with no listings yet, an accent/spelling variant, a typo) must still get a chance at
    // it instead of silently searching with no city constraint at all.
    if (hasGeminiKey && (Object.keys(filters).length === 0 || !filters.city)) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EXTRACTION_MODEL}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: effectiveMessage }] }],
              systemInstruction: {
                parts: [{ text: chatQueryTextInstruction() }],
              },
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            // Heuristic values win on conflict (grounded in an exact DB city match); Gemini only
            // fills gaps the heuristic left empty (e.g. city).
            filters = { ...parsed, ...filters };
          }
        }
      } catch (geminiErr) {
        console.warn('[chat-query] Gemini parsing error, using heuristic fallback:', geminiErr);
      }
    }

    let items: any[] = [];
    let usedHybridSearch = false;
    const queryEmbedding = hasGeminiKey ? await embedText(effectiveMessage, geminiKey!, 'RETRIEVAL_QUERY') : null;
    const hybrid = buildHybridSearch({
      message: effectiveMessage,
      filters: filters as Record<string, unknown>,
      knownCities,
      embedding: queryEmbedding,
    });

    try {
      const { data: hybridMatches, error: hybridError } = await callerSupabase.rpc(
        'search_properties_hybrid',
        hybrid.params
      );
      if (hybridError) throw hybridError;
      items = hybridMatches || [];
      usedHybridSearch = true;
    } catch (hybridErr) {
      console.warn('[chat-query] hybrid search failed, falling back to structured query:', hybridErr);
    }

    if (!usedHybridSearch) {
      let query = callerSupabase
        .from('property_listings')
        .select(
          'id, title, property_type, operation_type, price, currency, bedrooms, bathrooms, square_meters, city, address, latitude, longitude, description, status, image_url, images, amenities, created_at, agency_id, agency_name, agent_name'
        );

      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.amenities && filters.amenities.length > 0) {
        query = query.contains('amenities', filters.amenities);
      }
      if (filters.property_type) {
        query = query.eq('property_type', filters.property_type);
      }
      if (filters.min_price !== undefined) {
        query = query.gte('price', filters.min_price);
      }
      if (filters.max_price !== undefined) {
        query = query.lte('price', filters.max_price);
      }
      if (filters.min_bedrooms !== undefined) {
        query = query.gte('bedrooms', filters.min_bedrooms);
      }
      if (filters.max_bedrooms !== undefined) {
        query = query.lte('bedrooms', filters.max_bedrooms);
      }
      if (filters.min_square_meters !== undefined) {
        query = query.gte('square_meters', filters.min_square_meters);
      }
      if (filters.max_square_meters !== undefined) {
        query = query.lte('square_meters', filters.max_square_meters);
      }

      if (filters.sort_by === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('price', { ascending: true });
      }

      query = query.limit(filters.limit || 10);

      const { data: properties, error: dbError } = await query;

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      items = properties || [];
    }

    const { answer, suggestions } = await composeSearchAnswer({
      message: effectiveMessage,
      items,
      filters: hybrid.filters,
      knownCities,
      geminiKey: hasGeminiKey ? geminiKey : undefined,
    });

    console.log(
      `[chat-query] request completed in ${Date.now() - requestStart}ms (${isAudioRequest ? 'audio' : 'text'})`
    );

    return new Response(
      JSON.stringify({
        answer,
        data: items,
        applied_filters: hybrid.filters,
        suggestions,
        ...(transcript ? { transcript } : {}),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error(`❌ [chat-query] Edge Function error after ${Date.now() - requestStart}ms:`, error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Internal error in chat-query Edge Function',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
