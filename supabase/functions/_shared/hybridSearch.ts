import {
  ACCENT_MARKS_PATTERN,
  DEFAULT_MATCH_COUNT,
  GENERIC_SEARCH_WORDS,
  MIN_SIMILARITY,
  MIN_TERM_LENGTH,
  NON_LETTER_PATTERN,
  PRICE_SORTS,
  SIMILARITY_WINDOW,
} from './hybridSearchConstants.ts';

type Filters = Record<string, unknown>;

export interface HybridSearchInput {
  message: string;
  filters: Filters;
  knownCities: string[];
  embedding: number[] | null;
}

export interface HybridSearchParams {
  query_embedding: number[] | null;
  p_query: string | null;
  p_place: string | null;
  p_city: string | null;
  p_property_type: string | null;
  p_min_price: number | null;
  p_max_price: number | null;
  p_min_bedrooms: number | null;
  p_max_bedrooms: number | null;
  p_min_similarity: number | null;
  p_similarity_window: number | null;
  p_sort: string | null;
  match_count: number;
}

const normalize = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(ACCENT_MARKS_PATTERN, '');

export function contentTerms(message: string, knownCities: string[]): string {
  let text = ` ${normalize(message).replace(NON_LETTER_PATTERN, ' ')} `;
  for (const city of knownCities) {
    const name = normalize(city).replace(NON_LETTER_PATTERN, ' ').trim();
    if (name) text = text.split(` ${name} `).join(' ');
  }
  return text
    .split(' ')
    .filter((word) => word.length >= MIN_TERM_LENGTH && !GENERIC_SEARCH_WORDS.has(word))
    .join(' ');
}

const numberOrNull = (value: unknown): number | null => (typeof value === 'number' ? value : null);
const stringOrNull = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

export function buildHybridSearch({ message, filters, knownCities, embedding }: HybridSearchInput) {
  const city = stringOrNull(filters.city);
  const known = new Set(knownCities.map(normalize));
  const isPlace = city !== null && !known.has(normalize(city));

  const { city: _city, ...rest } = filters;
  const effectiveFilters: Filters = isPlace ? { ...rest, place: city } : filters;

  const terms = contentTerms(message, knownCities);
  const sort = PRICE_SORTS.find((value) => value === filters.sort_by) ?? null;

  const params: HybridSearchParams = {
    query_embedding: embedding,
    p_query: terms || null,
    p_place: isPlace ? city : null,
    p_city: isPlace ? null : city,
    p_property_type: stringOrNull(filters.property_type),
    p_min_price: numberOrNull(filters.min_price),
    p_max_price: numberOrNull(filters.max_price),
    p_min_bedrooms: numberOrNull(filters.min_bedrooms),
    p_max_bedrooms: numberOrNull(filters.max_bedrooms),
    p_min_similarity: terms ? MIN_SIMILARITY : null,
    p_similarity_window: terms ? SIMILARITY_WINDOW : null,
    p_sort: sort,
    match_count: numberOrNull(filters.limit) ?? DEFAULT_MATCH_COUNT,
  };

  return { params, filters: effectiveFilters };
}
