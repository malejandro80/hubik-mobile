import { extractAmenityKeywords } from './amenities.ts';
import { matchCityInText } from './cityMatch.ts';
import {
  AREA_SIGNAL_REGEX,
  BEDROOMS_REGEX,
  LIMIT_REGEX,
  MAX_AREA_REGEX,
  MAX_PRICE_REGEX,
  MIN_AREA_REGEX,
  MIN_PRICE_REGEX,
  PROPERTY_TYPE_KEYWORDS,
  SORT_CHEAPEST_REGEX,
  SORT_EXPENSIVE_REGEX,
  SQFT_SIGNAL_REGEX,
  SQFT_TO_SQM_RATIO,
  THOUSANDS_MULTIPLIER,
} from './promptFiltersConstants.ts';

export type FilterPropertyType = (typeof PROPERTY_TYPE_KEYWORDS)[number][0];

export interface PromptFilters {
  city?: string;
  place?: string;
  property_type?: FilterPropertyType;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  min_square_meters?: number;
  max_square_meters?: number;
  limit?: number;
  sort_by?: 'price_asc' | 'price_desc';
  amenities?: string[];
}

function parsePriceValue(raw: string): number {
  const cleaned = raw.toLowerCase();
  const value = parseInt(cleaned.replace(/[k,]/g, ''), 10);
  return cleaned.includes('k') ? value * THOUSANDS_MULTIPLIER : value;
}

function parseAreaValue(match: RegExpMatchArray | null, text: string): number | undefined {
  if (!match || !AREA_SIGNAL_REGEX.test(text)) return undefined;
  const value = parseInt(match[1], 10);
  return SQFT_SIGNAL_REGEX.test(text) ? Math.round(value * SQFT_TO_SQM_RATIO) : value;
}

export function extractPropertyType(lower: string): FilterPropertyType | undefined {
  return PROPERTY_TYPE_KEYWORDS.find(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))?.[0];
}

export function parsePromptFilters(
  message: string,
  knownCities: readonly string[],
  knownSectors: readonly string[] = []
): PromptFilters {
  const lower = message.toLowerCase();
  const filters: PromptFilters = {};

  const city = matchCityInText(message, knownCities);
  if (city) filters.city = city;

  const place = matchCityInText(message, knownSectors);
  if (place) filters.place = place;

  const amenities = extractAmenityKeywords(message);
  if (amenities.length > 0) filters.amenities = amenities;

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
