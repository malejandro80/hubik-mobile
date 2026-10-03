import { ACCENT_MARKS_PATTERN } from './hybridSearchConstants.ts';

export const normalizePlace = (text: string): string =>
  text.toLowerCase().normalize('NFD').replace(ACCENT_MARKS_PATTERN, '').replace(/\s+/g, ' ').trim();

export function matchCityInText(text: string, knownCities: readonly string[]): string | undefined {
  const normalizedText = normalizePlace(text);
  return knownCities.find((city) => normalizedText.includes(normalizePlace(city)));
}
