import {
  MAX_EXTRACTED_AMENITIES,
  MAX_EXTRACTED_AMENITY_LENGTH,
  MAX_EXTRACTED_CITY_LENGTH,
  MAX_EXTRACTED_LIMIT,
  NUMERIC_FILTER_KEYS,
} from './extractedFiltersConstants.ts';
import { PRICE_SORTS } from './hybridSearchConstants.ts';
import { FilterOperationType, FilterPropertyType, PromptFilters } from './promptFilters.ts';
import { OPERATION_TYPE_PATTERNS, PROPERTY_TYPE_KEYWORDS } from './promptFiltersConstants.ts';

const PROPERTY_TYPES: readonly unknown[] = PROPERTY_TYPE_KEYWORDS.map(([type]) => type);

const OPERATION_TYPES: readonly unknown[] = OPERATION_TYPE_PATTERNS.map(([type]) => type);

const SORTS: readonly unknown[] = PRICE_SORTS;

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function amenities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= MAX_EXTRACTED_AMENITY_LENGTH)
    .slice(0, MAX_EXTRACTED_AMENITIES);
}

export function sanitizeExtractedFilters(raw: unknown): PromptFilters {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const filters: PromptFilters = {};

  const city = typeof input.city === 'string' ? input.city.trim() : '';
  if (city && city.length <= MAX_EXTRACTED_CITY_LENGTH) filters.city = city;
  if (PROPERTY_TYPES.includes(input.property_type)) filters.property_type = input.property_type as FilterPropertyType;
  if (OPERATION_TYPES.includes(input.operation_type)) filters.operation_type = input.operation_type as FilterOperationType;

  for (const key of NUMERIC_FILTER_KEYS) {
    const value = input[key];
    if (isCount(value)) filters[key] = value;
  }

  if (isCount(input.limit) && Number.isInteger(input.limit) && input.limit > 0 && input.limit <= MAX_EXTRACTED_LIMIT) {
    filters.limit = input.limit;
  }
  if (SORTS.includes(input.sort_by)) filters.sort_by = input.sort_by as PromptFilters['sort_by'];

  const amenityList = amenities(input.amenities);
  if (amenityList.length > 0) filters.amenities = amenityList;

  return filters;
}
