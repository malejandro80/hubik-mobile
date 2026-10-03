type Row = Record<string, unknown>;

export type PlaceRelaxation = 'near' | 'nearby' | 'city';

export interface PlaceFallbackInput {
  items: Row[];
  place: string | null;
  city: string | null;
  nearRequested: boolean;
  searchNearby: (place: string) => Promise<Row[]>;
  searchWithoutPlace: () => Promise<Row[]>;
}

export interface PlaceFallbackResult {
  items: Row[];
  relaxed: PlaceRelaxation | null;
}

async function attempt(step: () => Promise<Row[]>): Promise<Row[]> {
  try {
    return await step();
  } catch {
    return [];
  }
}

export async function searchWithPlaceFallback(input: PlaceFallbackInput): Promise<PlaceFallbackResult> {
  const { items, place, city, nearRequested } = input;
  if (!place) return { items, relaxed: null };

  if (nearRequested) {
    const near = await attempt(() => input.searchNearby(place));
    return near.length > 0 ? { items: near, relaxed: 'near' } : { items, relaxed: null };
  }

  if (items.length > 0) return { items, relaxed: null };

  const nearby = await attempt(() => input.searchNearby(place));
  if (nearby.length > 0) return { items: nearby, relaxed: 'nearby' };

  if (!city) return { items, relaxed: null };
  const inCity = await attempt(input.searchWithoutPlace);
  return inCity.length > 0 ? { items: inCity, relaxed: 'city' } : { items, relaxed: null };
}
