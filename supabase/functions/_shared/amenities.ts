import {
  AMENITY_KEYWORDS,
  AMENITY_SIGNAL_REGEX,
  MAX_AMENITIES,
  MAX_AMENITY_LENGTH,
} from './amenitiesConstants.ts';

export function extractAmenityKeywords(text: string): string[] {
  const hits = new Set<string>();
  for (const [regex, tag] of AMENITY_KEYWORDS) {
    if (regex.test(text)) hits.add(tag);
  }
  return Array.from(hits);
}

export function normalizeAmenities(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cleaned || cleaned.length > MAX_AMENITY_LENGTH || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
    if (result.length >= MAX_AMENITIES) break;
  }
  return result;
}

export function hasAmenitySignal(text: string): boolean {
  return AMENITY_SIGNAL_REGEX.test(text);
}
