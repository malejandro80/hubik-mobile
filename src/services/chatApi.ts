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

    const typeMap: Record<string, string> = {
      Apartment: 'Departamentos',
      Condo: 'Condominios',
      Townhouse: 'Casas adosadas',
      Studio: 'Estudios',
      'Single Family': 'Casas familiares',
    };

    for (const item of data) {
      if (!item.city) continue;
      const type = (item.property_type && typeMap[item.property_type]) || 'Propiedades';
      const roundedPrice = item.price ? Math.ceil(item.price / 50000) * 50 : 0;
      const phrase =
        roundedPrice > 0
          ? `${type} en ${item.city} por menos de $${roundedPrice}k`
          : `${type} en ${item.city}`;

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

  // Limit extraction (e.g. "give 3 properties", "muestra 3", "top 5")
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
