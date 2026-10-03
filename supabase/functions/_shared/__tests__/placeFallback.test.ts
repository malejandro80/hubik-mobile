import { searchWithPlaceFallback } from '../placeFallback';

const inPlace = [{ id: 'a' }];
const nearby = [{ id: 'b', distance_km: 1.5 }];
const inCity = [{ id: 'c' }];

const run = (overrides: Partial<Parameters<typeof searchWithPlaceFallback>[0]>) =>
  searchWithPlaceFallback({
    items: [],
    place: 'Prebo',
    city: 'Valencia',
    nearRequested: false,
    searchNearby: jest.fn().mockResolvedValue(nearby),
    searchWithoutPlace: jest.fn().mockResolvedValue(inCity),
    ...overrides,
  });

describe('searchWithPlaceFallback', () => {
  it('returns the original results when there is no place', async () => {
    const searchNearby = jest.fn();
    expect(await run({ items: inPlace, place: null, searchNearby })).toEqual({ items: inPlace, relaxed: null });
    expect(searchNearby).not.toHaveBeenCalled();
  });

  it('returns the original results when the place has matches', async () => {
    expect(await run({ items: inPlace })).toEqual({ items: inPlace, relaxed: null });
  });

  it('goes straight to the nearby search when the user asks for listings near a place', async () => {
    expect(await run({ items: inPlace, nearRequested: true })).toEqual({ items: nearby, relaxed: 'near' });
  });

  it('keeps the original results when a near request finds nothing nearby', async () => {
    expect(await run({ items: inPlace, nearRequested: true, searchNearby: jest.fn().mockResolvedValue([]) })).toEqual({
      items: inPlace,
      relaxed: null,
    });
  });

  it('falls back to nearby listings when the place has no matches', async () => {
    expect(await run({})).toEqual({ items: nearby, relaxed: 'nearby' });
  });

  it('falls back to the rest of the city when nothing is nearby', async () => {
    expect(await run({ searchNearby: jest.fn().mockResolvedValue([]) })).toEqual({ items: inCity, relaxed: 'city' });
  });

  it('does not widen to the city when no city was requested', async () => {
    const searchWithoutPlace = jest.fn();
    const result = await run({ city: null, searchNearby: jest.fn().mockResolvedValue([]), searchWithoutPlace });

    expect(result).toEqual({ items: [], relaxed: null });
    expect(searchWithoutPlace).not.toHaveBeenCalled();
  });

  it('treats a failing step as empty and keeps cascading', async () => {
    const result = await run({ searchNearby: jest.fn().mockRejectedValue(new Error('rpc down')) });

    expect(result).toEqual({ items: inCity, relaxed: 'city' });
  });
});
