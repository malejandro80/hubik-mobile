import { createClient } from 'jsr:@supabase/supabase-js@2';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
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
    return Array.from(seen).sort((a, b) => b.length - a.length);
  } catch {
    return [];
  }
}

export function matchCityInText(text: string, knownCities: string[]): string | undefined {
  const normalizedText = normalize(text);
  for (const city of knownCities) {
    if (normalizedText.includes(normalize(city))) {
      return city;
    }
  }
  return undefined;
}
