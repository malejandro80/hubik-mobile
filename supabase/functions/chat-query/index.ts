import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { isAudioPayload } from '../_shared/audioPayload.ts';
import { fetchKnownPlaces } from '../_shared/cities.ts';
import { embedText } from '../_shared/geminiEmbedding.ts';
import { sanitizeExtractedFilters } from '../_shared/extractedFilters.ts';
import { buildHybridSearch, suggestionSearchParams } from '../_shared/hybridSearch.ts';
import { NEAR_REQUEST_PATTERN } from '../_shared/hybridSearchConstants.ts';
import { searchWithPlaceFallback } from '../_shared/placeFallback.ts';
import { parsePromptFilters, PromptFilters } from '../_shared/promptFilters.ts';
import { composeSearchAnswer, fallbackSearchAnswer, SearchAnswer } from '../_shared/searchAnswer.ts';
import { alternativesAnswer, findAlternatives, suggestionFilters } from '../_shared/searchSuggestions.ts';
import { chatQueryTextInstruction, GEMINI_EXTRACTION_MODEL } from '../_shared/prompts.ts';
import { transcribeAudio } from '../_shared/groqAudio.ts';
import { geminiGenerateJson } from '../_shared/geminiFacade.ts';
import { ErrorCode, handleErrorResponse } from '../_shared/errorFacade.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

async function noResultsAnswer(
  client: SupabaseClient,
  message: string,
  filters: PromptFilters,
  answerFilters: Record<string, unknown>,
  knownCities: string[]
): Promise<SearchAnswer> {
  const wanted = suggestionFilters(filters, knownCities);
  const alternatives = await findAlternatives({
    filters: wanted,
    knownCities,
    search: (candidate) => rpcRows(client, 'search_listings', suggestionSearchParams(candidate)),
  });
  return alternatives.length > 0 ? alternativesAnswer(message, alternatives) : fallbackSearchAnswer([], answerFilters, knownCities);
}

async function rpcRows(
  client: SupabaseClient,
  fn: string,
  params: unknown
): Promise<Record<string, unknown>[]> {
  const { data, error } = await client.rpc(fn, params as Record<string, unknown>);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
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

    let transcript: string | undefined;
    let effectiveMessage: string;

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const hasGeminiKey = Boolean(geminiKey) && geminiKey !== 'your_gemini_api_key_here';

    const groqKey = Deno.env.get('GROQ_API_KEY');

    if (isAudioRequest) {
      if (!groqKey) {
        return new Response(
          JSON.stringify({ error: 'Las notas de voz requieren que Groq esté configurado en el servidor' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const transcribeStart = Date.now();
      try {
        transcript = await transcribeAudio(audio, groqKey);
        effectiveMessage = transcript;
        if (body?.transcribe_only === true) {
          return new Response(JSON.stringify({ transcript }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (transcribeErr: unknown) {
        return handleErrorResponse(transcribeErr, {
          logTag: 'chat-query',
          corsHeaders,
          requestStart: transcribeStart,
          fallbackCode: ErrorCode.UPSTREAM_SERVICE_ERROR,
          fallbackMessage: 'No se pudo procesar la nota de voz',
        });
      }
    } else {
      effectiveMessage = message;
    }

    const embeddingRequest = hasGeminiKey
      ? embedText(effectiveMessage, geminiKey!, 'RETRIEVAL_QUERY')
      : Promise.resolve(null);
    const { cities: knownCities, sectors: knownSectors } = await fetchKnownPlaces(supabaseUrl, supabaseKey);
    let filters: PromptFilters = parsePromptFilters(effectiveMessage, knownCities, knownSectors);

    if (hasGeminiKey && !filters.city && !filters.place) {
      const extractedFilters = await geminiGenerateJson<unknown>({
        model: GEMINI_EXTRACTION_MODEL,
        key: geminiKey!,
        prompt: effectiveMessage,
        systemInstruction: chatQueryTextInstruction(),
        logTag: 'chat-query',
      });

      if (extractedFilters) {
        filters = { ...sanitizeExtractedFilters(extractedFilters), ...filters };
      }
    }

    let items: any[] = [];
    let usedHybridSearch = false;
    const queryEmbedding = await embeddingRequest;
    const hybrid = buildHybridSearch({
      message: effectiveMessage,
      filters: filters as Record<string, unknown>,
      knownCities,
      knownSectors,
      embedding: queryEmbedding,
    });

    try {
      const { data: hybridMatches, error: hybridError } = await callerSupabase.rpc(
        'search_listings',
        hybrid.params
      );
      if (hybridError) throw hybridError;
      items = hybridMatches || [];
      usedHybridSearch = true;
    } catch {
      usedHybridSearch = false;
    }

    let answerFilters: Record<string, unknown> = hybrid.filters;
    if (usedHybridSearch) {
      const placeSearch = await searchWithPlaceFallback({
        items,
        place: hybrid.nearbyParams?.p_place ?? null,
        city: hybrid.cityParams.p_city,
        nearRequested: NEAR_REQUEST_PATTERN.test(effectiveMessage),
        searchNearby: () => rpcRows(callerSupabase, 'search_properties_nearby', hybrid.nearbyParams),
        searchWithoutPlace: () => rpcRows(callerSupabase, 'search_listings', hybrid.cityParams),
      });
      items = placeSearch.items;
      if (placeSearch.relaxed) answerFilters = { ...hybrid.filters, relaxed: placeSearch.relaxed };
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
      if (filters.operation_type) {
        query = query.eq('operation_type', filters.operation_type);
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

    const { answer, suggestions } =
      items.length === 0
        ? await noResultsAnswer(callerSupabase, effectiveMessage, filters, answerFilters, knownCities)
        : await composeSearchAnswer({
            message: effectiveMessage,
            items,
            filters: answerFilters,
            knownCities,
            geminiKey: hasGeminiKey ? geminiKey : undefined,
          });

    return new Response(
      JSON.stringify({
        answer,
        data: items,
        applied_filters: answerFilters,
        suggestions,
        ...(transcript ? { transcript } : {}),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    return handleErrorResponse(error, {
      logTag: 'chat-query',
      corsHeaders,
      requestStart,
      fallbackMessage: 'Internal error in chat-query Edge Function',
    });
  }
});
