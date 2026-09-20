import { createClient } from 'jsr:@supabase/supabase-js@2';

// Search/intake used to match cities against a small hardcoded array (Austin/Miami/Denver/
// Seattle/New York, or a slightly longer Spain-only list for registration) - anything outside
// that list, e.g. Bogotá, Lima, Buenos Aires, CDMX, was invisible to the heuristic. Instead of
// maintaining a manual list per region, this derives "known cities" from whatever is already in
// `properties.city` - it scales to any city/region automatically as listings get published, with
// zero maintenance and no new vendor. Coverage for a city with zero listings yet still comes from
// the Gemini fallback (world knowledge, no list needed) - see chat-query/property-intake.

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // strip accents (á/é/í/ó/ú/ñ -> a/e/i/o/u/n)
}

export async function fetchKnownCities(supabaseUrl: string, supabaseKey: string): Promise<string[]> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('properties').select('city');
    if (error || !data) return [];
    const seen = new Set<string>();
    for (const row of data) {
      if (row.city) seen.add(row.city as string);
    }
    // Longest first, so a more specific name (e.g. "Ciudad de Mexico") matches before a shorter
    // one that happens to be a substring of it.
    return Array.from(seen).sort((a, b) => b.length - a.length);
  } catch (err) {
    console.warn('[cities] fetchKnownCities failed, city matching degrades to Gemini-only:', err);
    return [];
  }
}

// Returns the city exactly as stored in the DB (correct accents/casing) so callers can use it
// directly as a filter value - matching happens on normalized (lowercase, accent-stripped) text
// so "bogota"/"Bogotá"/"BOGOTA" all match the same stored "Bogotá".
export function matchCityInText(text: string, knownCities: string[]): string | undefined {
  const normalizedText = normalize(text);
  for (const city of knownCities) {
    if (normalizedText.includes(normalize(city))) {
      return city;
    }
  }
  return undefined;
}
