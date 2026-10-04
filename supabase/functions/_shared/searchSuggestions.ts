import { normalizePlace } from './cityMatch.ts';
import { FilterOperationType, PromptFilters } from './promptFilters.ts';
import type { SearchAnswer } from './searchAnswer.ts';
import { MAX_SUGGESTIONS } from './searchAnswerConstants.ts';
import {
  alternativesIntro,
  alternativeWithCount,
  bedroomsPhrase,
  DEFAULT_SUGGESTION_LABEL,
  inCityPhrase,
  MAX_QUOTED_SEARCH_LENGTH,
  maxPricePhrase,
  minPricePhrase,
  noMatchAnswer,
  SUGGESTION_OPERATION_LABELS,
  SUGGESTION_TYPE_LABELS,
  TRUNCATION_MARK,
} from './searchSuggestionsConstants.ts';

type Row = Record<string, unknown>;

export interface SuggestionFilters {
  city?: string;
  property_type?: string;
  operation_type?: FilterOperationType;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
}

export interface Alternative {
  label: string;
  count: number;
}

export interface FindAlternativesInput {
  filters: SuggestionFilters;
  knownCities: string[];
  search: (filters: SuggestionFilters) => Promise<Row[]>;
}

const knownCity = (city: unknown, knownCities: string[]): string | undefined =>
  typeof city === 'string' ? knownCities.find((known) => normalizePlace(known) === normalizePlace(city)) : undefined;

export function suggestionFilters(filters: PromptFilters, knownCities: string[]): SuggestionFilters {
  const city = knownCity(filters.city, knownCities);
  const picked: SuggestionFilters = {
    city,
    property_type: filters.property_type,
    operation_type: filters.operation_type,
    min_price: filters.min_price,
    max_price: filters.max_price,
    min_bedrooms: filters.min_bedrooms,
  };
  return Object.fromEntries(Object.entries(picked).filter(([, value]) => value !== undefined));
}

export function describeSearch(filters: SuggestionFilters): string {
  const parts = [(filters.property_type && SUGGESTION_TYPE_LABELS[filters.property_type]) || DEFAULT_SUGGESTION_LABEL];
  if (filters.operation_type) parts.push(SUGGESTION_OPERATION_LABELS[filters.operation_type]);
  if (filters.city) parts.push(inCityPhrase(filters.city));
  if (filters.min_bedrooms !== undefined) parts.push(bedroomsPhrase(filters.min_bedrooms));
  if (filters.min_price !== undefined) parts.push(minPricePhrase(filters.min_price));
  if (filters.max_price !== undefined) parts.push(maxPricePhrase(filters.max_price));
  return parts.join(' ');
}

function without(filters: SuggestionFilters, ...keys: (keyof SuggestionFilters)[]): SuggestionFilters {
  const copy = { ...filters };
  for (const key of keys) delete copy[key];
  return copy;
}

function relaxedFilters(filters: SuggestionFilters): SuggestionFilters[] {
  const candidates = [filters];
  if (filters.operation_type) {
    candidates.push({ ...filters, operation_type: filters.operation_type === 'rent' ? 'sale' : 'rent' });
  }
  if (filters.property_type) candidates.push(without(filters, 'property_type'));
  if (filters.min_price !== undefined || filters.max_price !== undefined) {
    candidates.push(without(filters, 'min_price', 'max_price'));
  }
  if (filters.min_bedrooms !== undefined) candidates.push(without(filters, 'min_bedrooms'));
  return candidates;
}

async function safeSearch(input: FindAlternativesInput, filters: SuggestionFilters): Promise<Row[]> {
  try {
    return await input.search(filters);
  } catch {
    return [];
  }
}

async function otherCities(input: FindAlternativesInput): Promise<Alternative[]> {
  const { filters, knownCities } = input;
  if (!filters.city) return [];
  const counts = new Map<string, number>();
  for (const row of await safeSearch(input, without(filters, 'city'))) {
    const city = knownCity(row.city, knownCities);
    if (city && normalizePlace(city) !== normalizePlace(filters.city)) counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([city, count]) => ({ label: describeSearch({ ...filters, city }), count }));
}

export async function findAlternatives(input: FindAlternativesInput): Promise<Alternative[]> {
  const [relaxed, cities] = await Promise.all([
    Promise.all(
      relaxedFilters(input.filters).map(async (filters) => ({
        label: describeSearch(filters),
        count: (await safeSearch(input, filters)).length,
      }))
    ),
    otherCities(input),
  ]);
  const seen = new Set<string>();
  return [...relaxed, ...cities]
    .filter((alternative) => alternative.count > 0 && !seen.has(alternative.label) && seen.add(alternative.label))
    .slice(0, MAX_SUGGESTIONS);
}

function quotedSearch(message: string): string {
  const text = message.trim().replace(/\s+/g, ' ');
  return text.length <= MAX_QUOTED_SEARCH_LENGTH
    ? text
    : `${text.slice(0, MAX_QUOTED_SEARCH_LENGTH - TRUNCATION_MARK.length).trimEnd()}${TRUNCATION_MARK}`;
}

export function alternativesAnswer(message: string, alternatives: Alternative[]): SearchAnswer {
  const listed = alternatives.map((alternative) => alternativeWithCount(alternative.label, alternative.count)).join(', ');
  return {
    answer: `${noMatchAnswer(quotedSearch(message))} ${alternativesIntro(listed)}`,
    suggestions: alternatives.map((alternative) => alternative.label),
  };
}
