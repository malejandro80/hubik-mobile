import {
  ACCENT_MARKS_PATTERN,
  DEFAULT_MATCH_COUNT,
  GENERIC_SEARCH_WORDS,
  MIN_SIMILARITY,
  MIN_TERM_LENGTH,
  NEARBY_RADIUS_KM,
  NON_LETTER_PATTERN,
  PRICE_SORTS,
  SIMILARITY_WINDOW,
} from './hybridSearchConstants.ts';

type Filters = Record<string, unknown>;

export interface HybridSearchInput {
  message: string;
  filters: Filters;
  knownCities: string[];
  knownSectors?: string[];
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
  p_min_square_meters: number | null;
  p_max_square_meters: number | null;
  p_min_similarity: number | null;
  p_similarity_window: number | null;
  p_sort: string | null;
  match_count: number;
}

export interface NearbySearchParams {
  p_place: string;
  p_radius_km: number;
  p_property_type: string | null;
  p_min_price: number | null;
  p_max_price: number | null;
  p_min_bedrooms: number | null;
  p_max_bedrooms: number | null;
  p_min_square_meters: number | null;
  p_max_square_meters: number | null;
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

export function buildHybridSearch({ message, filters, knownCities, knownSectors = [], embedding }: HybridSearchInput) {
  const city = stringOrNull(filters.city);
  const known = new Set(knownCities.map(normalize));
  const cityIsPlace = city !== null && !known.has(normalize(city));
  const place = stringOrNull(filters.place) ?? (cityIsPlace ? city : null);
  const searchCity = cityIsPlace ? null : city;

  const { city: _city, ...rest } = filters;
  const effectiveFilters: Filters = cityIsPlace ? { ...rest, place } : filters;

  const knownPlaces = [...knownCities, ...knownSectors];
  const terms = contentTerms(message, knownPlaces);
  const cityTerms = place ? contentTerms(message, [...knownPlaces, place]) : terms;
  const sort = PRICE_SORTS.find((value) => value === filters.sort_by) ?? null;
  const matchCount = numberOrNull(filters.limit) ?? DEFAULT_MATCH_COUNT;

  const hardFilters = {
    p_property_type: stringOrNull(filters.property_type),
    p_min_price: numberOrNull(filters.min_price),
    p_max_price: numberOrNull(filters.max_price),
    p_min_bedrooms: numberOrNull(filters.min_bedrooms),
    p_max_bedrooms: numberOrNull(filters.max_bedrooms),
    p_min_square_meters: numberOrNull(filters.min_square_meters),
    p_max_square_meters: numberOrNull(filters.max_square_meters),
  };

  const relevance = (contentQuery: string) => ({
    p_query: contentQuery || null,
    p_min_similarity: contentQuery ? MIN_SIMILARITY : null,
    p_similarity_window: contentQuery ? SIMILARITY_WINDOW : null,
  });

  const params: HybridSearchParams = {
    query_embedding: embedding,
    ...relevance(terms),
    p_place: place,
    p_city: searchCity,
    ...hardFilters,
    p_sort: sort,
    match_count: matchCount,
  };

  const cityParams: HybridSearchParams = { ...params, ...relevance(cityTerms), p_place: null };

  const nearbyParams: NearbySearchParams | null = place
    ? { p_place: place, p_radius_km: NEARBY_RADIUS_KM, ...hardFilters, match_count: matchCount }
    : null;

  return { params, cityParams, nearbyParams, filters: effectiveFilters };
}
