import { Property } from '../types/property';
import { supabase } from '../lib/supabase';

export interface ChatResponse {
  answer: string;
  data: Property[];
  applied_filters?: Record<string, any>;
  suggestions?: string[];
}

export async function fetchDynamicSuggestions(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('city, property_type, price')
      .order('created_at', { ascending: false })
      .limit(8);

    if (error || !data || data.length === 0) {
      return [];
    }

    const suggestions: string[] = [];
    const seen = new Set<string>();

    for (const item of data) {
      if (!item.city) continue;
      const type = item.property_type ? `${item.property_type}s` : 'Homes';
      const roundedPrice = item.price ? Math.ceil(item.price / 50000) * 50 : 0;
      const phrase =
        roundedPrice > 0
          ? `${type} in ${item.city} under $${roundedPrice}k`
          : `${type} in ${item.city}`;

      if (!seen.has(phrase)) {
        seen.add(phrase);
        suggestions.push(phrase);
      }
      if (suggestions.length >= 4) break;
    }

    return suggestions;
  } catch {
    return [];
  }
}


export function parsePromptFilters(message: string): Record<string, any> {
  const lower = message.toLowerCase();
  const filters: Record<string, any> = {};

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
    /(?:under|below|less than|<|max)\s*\$?(\d+(?:k|,\d{3}|\.000)?)\b(?!\s*(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft|bed|br))/i
  );
  if (maxPriceMatch) {
    const raw = maxPriceMatch[1].toLowerCase();
    let val = parseInt(raw.replace(/[k,]/g, ''), 10);
    if (raw.includes('k')) val *= 1000;
    filters.max_price = val;
  }

  const minPriceMatch = lower.match(
    /(?:above|over|more than|>|min)\s*\$?(\d+(?:k|,\d{3}|\.000)?)\b(?!\s*(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft|bed|br))/i
  );
  if (minPriceMatch) {
    const raw = minPriceMatch[1].toLowerCase();
    let val = parseInt(raw.replace(/[k,]/g, ''), 10);
    if (raw.includes('k')) val *= 1000;
    filters.min_price = val;
  }

  const bedMatch = lower.match(/(\d+)\s*(?:-| )?(?:bed|bedroom|br)/);
  if (bedMatch) {
    filters.min_bedrooms = parseInt(bedMatch[1], 10);
  }

  const maxAreaMatch = lower.match(
    /(?:less than|less|under|below|<|max)\s*(\d+)\s*(?:square meters|square metres|metros cuadrados|metros|m2|m²|sqm|sq m|square feet|square feets|sqft|sq ft|sq\.ft)?/
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
    /(?:more than|over|above|>|min)\s*(\d+)\s*(?:square meters|square metres|metros cuadrados|metros|m2|m²|sqm|sq m|square feet|square feets|sqft|sq ft|sq\.ft)?/
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

  // Limit extraction (e.g. "give 3 properties", "give 3 properites", "top 5", "show 3")
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

export async function querySupabaseDirectly(message: string): Promise<ChatResponse> {
  const filters = parsePromptFilters(message);

  let query = supabase
    .from('properties')
    .select(
      'id, title, property_type, price, bedrooms, bathrooms, square_meters, city, address, status, image_url, images, created_at'
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
  if (filters.min_square_meters !== undefined) {
    query = query.gte('square_meters', filters.min_square_meters);
  }
  if (filters.max_square_meters !== undefined) {
    query = query.lte('square_meters', filters.max_square_meters);
  }

  if (filters.sort_by === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (filters.sort_by === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('price', { ascending: true });
  }

  query = query.limit(filters.limit || 10);

  const { data, error } = await query;

  if (error) {
    console.error('❌ [chatApi] Direct Supabase query error:', error.message);
    throw new Error(`Database query error: ${error.message}`);
  }

  const properties = (data || []) as Property[];

  let answer: string;
  if (properties.length === 0) {
    answer = `I couldn't find any properties in the database matching "${message}". Try searching for Austin, Miami, Denver, Seattle, or New York!`;
  } else {
    const cityText = filters.city ? ` in ${filters.city}` : '';
    const typeText = filters.property_type ? ` ${filters.property_type.toLowerCase()}s` : ' properties';
    answer = `Found ${properties.length}${typeText}${cityText} directly in the Hubik database:`;
  }

  const suggestions: string[] = [];
  if (filters.city) {
    suggestions.push(`Cheapest properties in ${filters.city}`);
    suggestions.push(`Luxury homes in ${filters.city}`);
  } else if (properties.length > 0 && properties[0].city) {
    suggestions.push(`Properties in ${properties[0].city}`);
  }

  return {
    answer,
    data: properties,
    applied_filters: filters,
    suggestions,
  };
}

export async function sendChatQuery(message: string): Promise<ChatResponse> {
  try {
    const { data, error } = await supabase.functions.invoke<ChatResponse>(
      'chat-query',
      {
        body: { message },
      }
    );

    if (error) {
      throw error;
    }

    if (data && data.answer) {
      return data;
    }

    throw new Error('Invalid response received from chat-query function');
  } catch (err: any) {
    console.warn(
      '[chatApi] Supabase Edge Function unreachable or failed. Querying Supabase database directly...',
      err?.message
    );
    return querySupabaseDirectly(message);
  }
}
