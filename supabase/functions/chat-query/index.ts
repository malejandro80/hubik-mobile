import { createClient } from 'jsr:@supabase/supabase-js@2';

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
  min_square_feet?: number;
  max_square_feet?: number;
  limit?: number;
  sort_by?: string;
  status?: string;
}

function parsePromptFilters(message: string): FilterParams {
  const lower = message.toLowerCase();
  const filters: FilterParams = {};

  const cities = ['Austin', 'Miami', 'Denver', 'Seattle', 'New York'];
  for (const city of cities) {
    if (lower.includes(city.toLowerCase())) {
      filters.city = city;
      break;
    }
  }

  if (lower.includes('apartment') || lower.includes('flat')) {
    filters.property_type = 'Apartment';
  } else if (lower.includes('condo')) {
    filters.property_type = 'Condo';
  } else if (lower.includes('townhouse') || lower.includes('townhome')) {
    filters.property_type = 'Townhouse';
  } else if (lower.includes('studio')) {
    filters.property_type = 'Studio';
  } else if (
    lower.includes('house') ||
    lower.includes('single family') ||
    lower.includes('home')
  ) {
    filters.property_type = 'Single Family';
  }

  const maxPriceMatch = lower.match(
    /(?:under|below|less than|<|max)\s*\$?(\d+)(?:k|,\d{3}|\.000)?/
  );
  if (maxPriceMatch) {
    let val = parseInt(maxPriceMatch[1], 10);
    if (lower.includes(`${maxPriceMatch[1]}k`)) val *= 1000;
    filters.max_price = val;
  }

  const minPriceMatch = lower.match(
    /(?:above|over|more than|>|min)\s*\$?(\d+)(?:k|,\d{3}|\.000)?/
  );
  if (minPriceMatch) {
    let val = parseInt(minPriceMatch[1], 10);
    if (lower.includes(`${minPriceMatch[1]}k`)) val *= 1000;
    filters.min_price = val;
  }

  const bedMatch = lower.match(/(\d+)\s*(?:-| )?(?:bed|bedroom|br)/);
  if (bedMatch) {
    filters.min_bedrooms = parseInt(bedMatch[1], 10);
  }

  const maxSqftMatch = lower.match(
    /(?:less than|less|under|below|<|max)\s*(\d+)\s*(?:square feet|square feets|sqft|sq ft|sq\.ft)?/
  );
  if (
    maxSqftMatch &&
    (lower.includes('square') || lower.includes('sqft') || lower.includes('sq ft'))
  ) {
    filters.max_square_feet = parseInt(maxSqftMatch[1], 10);
  }

  const minSqftMatch = lower.match(
    /(?:more than|over|above|>|min)\s*(\d+)\s*(?:square feet|square feets|sqft|sq ft|sq\.ft)?/
  );
  if (
    minSqftMatch &&
    (lower.includes('square') || lower.includes('sqft') || lower.includes('sq ft'))
  ) {
    filters.min_square_feet = parseInt(minSqftMatch[1], 10);
  }

  const limitMatch = lower.match(/(?:give|show|find|list|top)\s*(?:me\s*)?(\d+)/);
  if (limitMatch) {
    filters.limit = parseInt(limitMatch[1], 10);
  }

  if (lower.includes('cheapest') || lower.includes('lowest price')) {
    filters.sort_by = 'price_asc';
  } else if (
    lower.includes('most expensive') ||
    lower.includes('highest price') ||
    lower.includes('luxury')
  ) {
    filters.sort_by = 'price_desc';
  }

  return filters;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message = body?.message;

    if (!message || typeof message !== 'string' || message.trim() === '') {
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

    // 1. Extract query parameters
    let filters: FilterParams = parsePromptFilters(message);

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
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
                    text: 'You are a real estate search assistant. Extract search filters as a JSON object with optional keys: city (string), property_type (Apartment, Single Family, Townhouse, Studio, Condo), min_price (number), max_price (number), min_bedrooms (number), max_bedrooms (number), min_square_feet (number), max_square_feet (number), limit (number), sort_by (price_asc, price_desc). Only output valid JSON.',
                  },
                ],
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
            filters = { ...filters, ...parsed };
          }
        }
      } catch (geminiErr) {
        console.warn('[chat-query] Gemini parsing error, using heuristic fallback:', geminiErr);
      }
    }

    // 2. Query properties from Supabase Postgres
    let query = supabase
      .from('properties')
      .select(
        'id, title, property_type, price, bedrooms, bathrooms, square_feet, city, address, status, image_url, images, created_at'
      );

    if (filters.city) {
      query = query.ilike('city', `%${filters.city}%`);
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
    if (filters.min_square_feet !== undefined) {
      query = query.gte('square_feet', filters.min_square_feet);
    }
    if (filters.max_square_feet !== undefined) {
      query = query.lte('square_feet', filters.max_square_feet);
    }

    if (filters.sort_by === 'price_asc') {
      query = query.order('price', { ascending: true });
    } else if (filters.sort_by === 'price_desc') {
      query = query.order('price', { ascending: false });
    } else {
      query = query.order('price', { ascending: true });
    }

    query = query.limit(filters.limit || 10);

    const { data: properties, error: dbError } = await query;

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    const items = properties || [];

    // 3. Synthesize conversational answer
    let answer: string;
    if (items.length === 0) {
      answer = `I couldn't find any properties matching "${message}". Try searching for Austin, Miami, Denver, Seattle, or New York!`;
    } else {
      const cityText = filters.city ? ` in ${filters.city}` : '';
      const typeText = filters.property_type
        ? ` ${filters.property_type.toLowerCase()}s`
        : ' properties';
      answer = `Found ${items.length}${typeText}${cityText} matching your criteria:`;
    }

    return new Response(
      JSON.stringify({
        answer,
        data: items,
        applied_filters: filters,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ [chat-query] Edge Function error:', error);
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
