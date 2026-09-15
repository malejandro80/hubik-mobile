import { Property } from '../types/property';
import { supabase } from '../lib/supabase';

export interface ChatResponse {
  answer: string;
  data: Property[];
  applied_filters?: Record<string, any>;
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
  if (maxSqftMatch && (lower.includes('square') || lower.includes('sqft') || lower.includes('sq ft'))) {
    filters.max_square_feet = parseInt(maxSqftMatch[1], 10);
  }
  const minSqftMatch = lower.match(
    /(?:more than|over|above|>|min)\s*(\d+)\s*(?:square feet|square feets|sqft|sq ft|sq\.ft)?/
  );
  if (minSqftMatch && (lower.includes('square') || lower.includes('sqft') || lower.includes('sq ft'))) {
    filters.min_square_feet = parseInt(minSqftMatch[1], 10);
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

  return {
    answer,
    data: properties,
    applied_filters: filters,
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
