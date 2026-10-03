import { createClient } from 'jsr:@supabase/supabase-js@2';
import { normalizePlace } from './cityMatch.ts';

export interface KnownPlaces {
  cities: string[];
  sectors: string[];
}

export async function fetchKnownPlaces(supabaseUrl: string, supabaseKey: string): Promise<KnownPlaces> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.rpc('known_places');
    if (error || !Array.isArray(data)) return { cities: [], sectors: [] };
    const names = (kind: string) =>
      data.filter((row) => row?.kind === kind && typeof row.name === 'string').map((row) => row.name as string);
    const cities = names('city');
    const cityKeys = new Set(cities.map(normalizePlace));
    return { cities, sectors: names('sector').filter((sector) => !cityKeys.has(normalizePlace(sector))) };
  } catch {
    return { cities: [], sectors: [] };
  }
}

export async function fetchKnownCities(supabaseUrl: string, supabaseKey: string): Promise<string[]> {
  return (await fetchKnownPlaces(supabaseUrl, supabaseKey)).cities;
}
