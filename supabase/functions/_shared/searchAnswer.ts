import { searchAnswerInstruction } from './prompts.ts';
import {
  ANSWER_FACT_FIELDS,
  ANSWER_TIMEOUT_MS,
  cheaperSuggestion,
  citySuggestion,
  DEFAULT_PROPERTY_PLURAL,
  GEMINI_ANSWER_MODEL,
  geminiGenerateUrl,
  luxurySuggestion,
  MAX_ALTERNATIVE_CITIES,
  MAX_ANSWER_LENGTH,
  MAX_FACT_ROWS,
  MAX_SUGGESTION_LENGTH,
  MAX_SUGGESTIONS,
  NO_RESULTS_ANSWER,
  noResultsAlternatives,
  PROPERTY_TYPE_PLURALS,
  resultsAnswer,
} from './searchAnswerConstants.ts';

type Row = Record<string, unknown>;

export interface SearchAnswer {
  answer: string;
  suggestions: string[];
}

export interface SearchAnswerInput {
  message: string;
  items: Row[];
  filters: Row;
  knownCities: string[];
  geminiKey?: string;
}

export function answerFacts(items: Row[]): Row[] {
  return items.slice(0, MAX_FACT_ROWS).map((item) => {
    const facts: Row = {};
    for (const field of ANSWER_FACT_FIELDS) {
      if (item[field] !== undefined) facts[field] = item[field];
    }
    return facts;
  });
}

export function parseSearchAnswer(raw: string): SearchAnswer | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const { answer, suggestions } = parsed as Row;
  if (typeof answer !== 'string') return null;
  const trimmed = answer.trim();
  if (!trimmed || trimmed.length > MAX_ANSWER_LENGTH) return null;
  if (suggestions !== undefined && !Array.isArray(suggestions)) return null;

  const cleanSuggestions = (suggestions ?? [])
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= MAX_SUGGESTION_LENGTH)
    .slice(0, MAX_SUGGESTIONS);

  return { answer: trimmed, suggestions: cleanSuggestions };
}

export function fallbackSearchAnswer(items: Row[], filters: Row, knownCities: string[]): SearchAnswer {
  const city = typeof filters.city === 'string' ? filters.city : undefined;

  if (items.length === 0) {
    const alternatives = knownCities
      .filter((known) => known.toLowerCase() !== city?.toLowerCase())
      .slice(0, MAX_ALTERNATIVE_CITIES);
    const answer = alternatives.length > 0 ? `${NO_RESULTS_ANSWER} ${noResultsAlternatives(alternatives)}` : NO_RESULTS_ANSWER;
    return { answer, suggestions: alternatives.slice(0, MAX_SUGGESTIONS).map(citySuggestion) };
  }

  const type = typeof filters.property_type === 'string' ? filters.property_type : '';
  const plural = PROPERTY_TYPE_PLURALS[type] ?? DEFAULT_PROPERTY_PLURAL;
  const firstCity = typeof items[0].city === 'string' ? items[0].city : undefined;
  const suggestions = city ? [cheaperSuggestion(city), luxurySuggestion(city)] : firstCity ? [citySuggestion(firstCity)] : [];

  return { answer: resultsAnswer(items.length, plural, city), suggestions };
}

async function requestAnswer(input: SearchAnswerInput, geminiKey: string): Promise<SearchAnswer | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANSWER_TIMEOUT_MS);
  try {
    const payload = {
      query: input.message,
      filters: input.filters,
      results: answerFacts(input.items),
      available_cities: input.knownCities,
    };
    const res = await fetch(geminiGenerateUrl(GEMINI_ANSWER_MODEL, geminiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: JSON.stringify(payload) }] }],
        systemInstruction: { parts: [{ text: searchAnswerInstruction() }] },
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      console.warn(`[searchAnswer] Gemini responded ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === 'string' ? parseSearchAnswer(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

export async function composeSearchAnswer(input: SearchAnswerInput): Promise<SearchAnswer> {
  const fallback = () => fallbackSearchAnswer(input.items, input.filters, input.knownCities);
  if (!input.geminiKey) return fallback();

  try {
    return (await requestAnswer(input, input.geminiKey)) ?? fallback();
  } catch (error) {
    console.warn('[searchAnswer] Gemini answer failed, using template:', error);
    return fallback();
  }
}
