import { extractAmenityKeywords, hasAmenitySignal, normalizeAmenities } from '../amenities';

describe('extractAmenityKeywords', () => {
  it('detects common bilingual amenity keywords', () => {
    expect(extractAmenityKeywords('Tiene piscina y garaje')).toEqual(
      expect.arrayContaining(['piscina', 'garaje'])
    );
    expect(extractAmenityKeywords('It has a pool and a gym')).toEqual(
      expect.arrayContaining(['piscina', 'gimnasio'])
    );
  });

  it('matches accented and unaccented variants', () => {
    expect(extractAmenityKeywords('cuenta con jardin')).toContain('jardín');
    expect(extractAmenityKeywords('tiene jardín amplio')).toContain('jardín');
    expect(extractAmenityKeywords('balcon grande')).toContain('terraza');
  });

  it('returns an empty array when nothing matches', () => {
    expect(extractAmenityKeywords('está cerca de un colegio')).toEqual([]);
  });

  it('deduplicates repeated mentions within the same message', () => {
    expect(extractAmenityKeywords('piscina, piscina y más piscina')).toEqual(['piscina']);
  });
});

describe('normalizeAmenities', () => {
  it('trims, lowercases, and dedupes', () => {
    expect(normalizeAmenities([' Piscina ', 'piscina', 'Garaje'])).toEqual(['piscina', 'garaje']);
  });

  it('drops non-string and empty entries', () => {
    expect(normalizeAmenities(['piscina', '', '   ', 42, null, undefined])).toEqual(['piscina']);
  });

  it('drops entries longer than 60 characters', () => {
    const long = 'a'.repeat(61);
    expect(normalizeAmenities(['piscina', long])).toEqual(['piscina']);
  });

  it('caps the list at 20 entries', () => {
    const many = Array.from({ length: 25 }, (_, i) => `amenity-${i}`);
    expect(normalizeAmenities(many)).toHaveLength(20);
  });

  it('returns an empty array for non-array input', () => {
    expect(normalizeAmenities(undefined)).toEqual([]);
    expect(normalizeAmenities('piscina')).toEqual([]);
  });
});

describe('hasAmenitySignal', () => {
  it('detects phrases that introduce an amenity or characteristic', () => {
    expect(hasAmenitySignal('la casa tiene piscina')).toBe(true);
    expect(hasAmenitySignal('está cerca de un colegio')).toBe(true);
    expect(hasAmenitySignal('cuenta con seguridad 24 horas')).toBe(true);
  });

  it('returns false for messages with no amenity signal', () => {
    expect(hasAmenitySignal('el precio es 200000')).toBe(false);
  });
});
