import { Property } from '../types/property';
import { ChatResponse } from '../types/chat';
import { supabase } from '../lib/supabase';
import { LISTING_COLUMNS } from '../constants/propertyColumns';
import {
  DEFAULT_QUERY_LIMIT,
  PROPERTY_TYPE_SUGGESTION_LABELS,
  SUGGESTION_FETCH_LIMIT,
  SUGGESTION_MAX_COUNT,
  SUGGESTION_PRICE_ROUNDING_STEP,
} from '../constants/chatApi';
import { parsePromptFilters } from '../lib/promptFilters';

export async function fetchDynamicSuggestions(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('city, property_type, price')
      .order('created_at', { ascending: false })
      .limit(SUGGESTION_FETCH_LIMIT);

    if (error || !data || data.length === 0) {
      return [];
    }

    const suggestions: string[] = [];
    const seen = new Set<string>();

    for (const item of data) {
      if (!item.city) continue;
      const type = (item.property_type && PROPERTY_TYPE_SUGGESTION_LABELS[item.property_type]) || 'Propiedades';
      const roundedPrice = item.price ? Math.ceil(item.price / SUGGESTION_PRICE_ROUNDING_STEP) * 50 : 0;
      const phrase =
        roundedPrice > 0
          ? `${type} en ${item.city} por menos de $${roundedPrice}k`
          : `${type} en ${item.city}`;

      if (!seen.has(phrase)) {
        seen.add(phrase);
        suggestions.push(phrase);
      }
      if (suggestions.length >= SUGGESTION_MAX_COUNT) break;
    }

    return suggestions;
  } catch {
    return [];
  }
}

export async function querySupabaseDirectly(message: string): Promise<ChatResponse> {
  const filters = parsePromptFilters(message);

  let query = supabase
    .from('property_listings')
    .select(LISTING_COLUMNS);

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

  if (filters.sort_by === 'price_asc') {
    query = query.order('price', { ascending: true });
  } else if (filters.sort_by === 'price_desc') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('price', { ascending: true });
  }

  query = query.limit(filters.limit || DEFAULT_QUERY_LIMIT);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Database query error: ${error.message}`);
  }

  const properties = (data || []) as Property[];

  let answer: string;
  if (properties.length === 0) {
    answer = `No encontré propiedades en la base de datos que coincidan con "${message}". ¡Intenta buscar en Austin, Miami, Denver, Seattle o New York!`;
  } else {
    const cityText = filters.city ? ` en ${filters.city}` : '';
    let typeText = ' propiedades';
    if (filters.property_type === 'Apartment') typeText = ' apartamentos';
    else if (filters.property_type === 'Single Family') typeText = ' casas familiares';
    else if (filters.property_type === 'Townhouse') typeText = ' casas adosadas';
    else if (filters.property_type === 'Condo') typeText = ' condominios';
    else if (filters.property_type === 'Studio') typeText = ' estudios';

    answer = `Encontré ${properties.length}${typeText}${cityText} en la base de datos de Hubik:`;
  }

  const suggestions: string[] = [];
  if (filters.city) {
    suggestions.push(`Propiedades más baratas en ${filters.city}`);
    suggestions.push(`Casas de lujo en ${filters.city}`);
  } else if (properties.length > 0 && properties[0].city) {
    suggestions.push(`Propiedades en ${properties[0].city}`);
  }

  return {
    answer,
    data: properties,
    applied_filters: filters,
    suggestions,
  };
}
