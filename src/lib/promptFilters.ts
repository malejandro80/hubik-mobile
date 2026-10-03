import { PropertyType } from '../types/property';
import { extractAmenityKeywords } from './amenities';
import { PROMPT_FILTER_CITIES, SQFT_TO_SQM_RATIO } from '../constants/chatApi';

const MAX_PRICE_REGEX =
  /(?:under|below|less than|<|max|menos de|menor a|hasta|máximo|maximo|bajo|debajo de)\s*\$?(\d+(?:k|,\d{3}|\.000)?)\b(?!\s*(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft|bed|br|hab|dorm|cuart|recám))/i;

const MIN_PRICE_REGEX =
  /(?:above|over|more than|>|min|más de|mas de|mayor a|desde|mínimo|minimo|sobre|arriba de)\s*\$?(\d+(?:k|,\d{3}|\.000)?)\b(?!\s*(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft|bed|br|hab|dorm|cuart|recám))/i;

const BEDROOMS_REGEX =
  /(\d+)\s*(?:-| )?(?:bed|bedroom|br|habitación|habitaciones|hab|dormitorio|dormitorios|cuarto|cuartos|recámara|recámaras)/i;

const MAX_AREA_REGEX =
  /(?:less than|less|under|below|<|max|menos de|menor a|hasta|máximo|maximo|debajo de)\s*(\d+)\s*(?:square meters|square metres|metros cuadrados|metros|m2|m²|sqm|sq m|square feet|square feets|sqft|sq ft|sq\.ft)?/i;

const MIN_AREA_REGEX =
  /(?:more than|over|above|>|min|más de|mas de|mayor a|desde|mínimo|minimo|arriba de)\s*(\d+)\s*(?:square meters|square metres|metros cuadrados|metros|m2|m²|sqm|sq m|square feet|square feets|sqft|sq ft|sq\.ft)?/i;

const AREA_SIGNAL_REGEX = /(?:m2|m²|sqm|sq\s*m|meter|metre|metro|square|sqft|sq\s*ft)/i;

const SQFT_SIGNAL_REGEX = /(?:sqft|sq\s*ft|square feet|feet)/i;

const LIMIT_REGEX =
  /(?:give|show|find|list|top|dame|muestra|mostrar|busca|buscar|encuentra|primeras|primeros)\s*(?:me\s*|las\s*|los\s*)?(\d+)/i;

const SORT_CHEAPEST_REGEX =
  /(?:cheapest|lowest price|más barato|mas barato|más barata|mas barata|más económico|mas economico|más económica|mas economica|menor precio)/i;

const SORT_EXPENSIVE_REGEX =
  /(?:most expensive|highest price|luxury|más caro|mas caro|más cara|mas cara|más costoso|mas costoso|más costosa|mas costosa|mayor precio|lujo|lujoso|lujosa)/i;

function parsePriceValue(raw: string): number {
  const cleaned = raw.toLowerCase();
  let val = parseInt(cleaned.replace(/[k,]/g, ''), 10);
  if (cleaned.includes('k')) val *= 1000;
  return val;
}

function parseAreaValue(match: RegExpMatchArray | null, text: string): number | undefined {
  if (!match || !AREA_SIGNAL_REGEX.test(text)) return undefined;
  let val = parseInt(match[1], 10);
  if (SQFT_SIGNAL_REGEX.test(text)) {
    val = Math.round(val * SQFT_TO_SQM_RATIO);
  }
  return val;
}

export function extractPropertyType(lower: string): PropertyType | undefined {
  if (
    lower.includes('apartamento') ||
    lower.includes('departamento') ||
    lower.includes('piso') ||
    lower.includes('flat') ||
    lower.includes('apartment')
  ) {
    return 'Apartment';
  }
  if (lower.includes('condominio') || lower.includes('condo')) return 'Condo';
  if (lower.includes('adosada') || lower.includes('townhouse') || lower.includes('townhome')) return 'Townhouse';
  if (lower.includes('estudio') || lower.includes('monoambiente') || lower.includes('studio')) return 'Studio';
  if (
    lower.includes('casa') ||
    lower.includes('vivienda') ||
    lower.includes('chalet') ||
    lower.includes('house') ||
    lower.includes('single family')
  ) {
    return 'Single Family';
  }
  return undefined;
}

export function parsePromptFilters(message: string): Record<string, any> {
  const lower = message.toLowerCase();
  const filters: Record<string, any> = {};

  for (const city of PROMPT_FILTER_CITIES) {
    if (lower.includes(city.toLowerCase())) {
      filters.city = city;
      break;
    }
  }

  const amenityHits = extractAmenityKeywords(message);
  if (amenityHits.length > 0) filters.amenities = amenityHits;

  const propertyType = extractPropertyType(lower);
  if (propertyType) filters.property_type = propertyType;

  const maxPriceMatch = lower.match(MAX_PRICE_REGEX);
  if (maxPriceMatch) filters.max_price = parsePriceValue(maxPriceMatch[1]);

  const minPriceMatch = lower.match(MIN_PRICE_REGEX);
  if (minPriceMatch) filters.min_price = parsePriceValue(minPriceMatch[1]);

  const bedMatch = lower.match(BEDROOMS_REGEX);
  if (bedMatch) filters.min_bedrooms = parseInt(bedMatch[1], 10);

  const maxArea = parseAreaValue(lower.match(MAX_AREA_REGEX), lower);
  if (maxArea !== undefined) filters.max_square_meters = maxArea;

  const minArea = parseAreaValue(lower.match(MIN_AREA_REGEX), lower);
  if (minArea !== undefined) filters.min_square_meters = minArea;

  const limitMatch = lower.match(LIMIT_REGEX);
  if (limitMatch) filters.limit = parseInt(limitMatch[1], 10);

  if (SORT_CHEAPEST_REGEX.test(lower)) {
    filters.sort_by = 'price_asc';
  } else if (SORT_EXPENSIVE_REGEX.test(lower)) {
    filters.sort_by = 'price_desc';
  }

  return filters;
}
