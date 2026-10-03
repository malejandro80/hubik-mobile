import { extractPropertyType, parsePromptFilters } from '../promptFilters';

const cities = ['Ciudad de México', 'Bogotá', 'Valencia'];

describe('extractPropertyType', () => {
  it('detects every property type from Spanish and English synonyms', () => {
    expect(extractPropertyType('piso luminoso')).toBe('Apartment');
    expect(extractPropertyType('condominio con vigilancia')).toBe('Condo');
    expect(extractPropertyType('casa adosada espaciosa')).toBe('Townhouse');
    expect(extractPropertyType('microestudio céntrico')).toBe('Studio');
    expect(extractPropertyType('family home')).toBe('Single Family');
  });

  it('returns undefined when no property type is present', () => {
    expect(extractPropertyType('propiedad en valencia')).toBeUndefined();
  });
});

describe('parsePromptFilters', () => {
  it('matches a known city regardless of accents and returns its stored spelling', () => {
    expect(parsePromptFilters('pisos en bogota', cities).city).toBe('Bogotá');
    expect(parsePromptFilters('casas en CIUDAD DE MEXICO', cities).city).toBe('Ciudad de México');
  });

  it('leaves the city out when it is not a known city', () => {
    expect(parsePromptFilters('pisos en Lima', cities).city).toBeUndefined();
  });

  it('reads a known sector as the place, next to its city', () => {
    const filters = parsePromptFilters('apartamentos en La Trigalena, Valencia', cities, ['La Trigaleña', 'Prebo']);

    expect(filters.city).toBe('Valencia');
    expect(filters.place).toBe('La Trigaleña');
  });

  it('leaves the place out when no known sector is mentioned', () => {
    expect(parsePromptFilters('pisos en Valencia', cities, ['Prebo']).place).toBeUndefined();
  });

  it('extracts type, bedrooms, price bounds and amenities', () => {
    expect(parsePromptFilters('casa de 3 habitaciones con piscina en Valencia desde 90k hasta 200k', cities)).toEqual({
      city: 'Valencia',
      property_type: 'Single Family',
      min_bedrooms: 3,
      min_price: 90000,
      max_price: 200000,
      amenities: ['piscina'],
    });
  });

  it('reads area bounds in square meters and converts square feet', () => {
    expect(parsePromptFilters('pisos de más de 100 m2', cities).min_square_meters).toBe(100);
    expect(parsePromptFilters('pisos de menos de 80 metros cuadrados', cities).max_square_meters).toBe(80);
    expect(parsePromptFilters('house under 1000 sqft', cities).max_square_meters).toBe(93);
  });

  it('does not read an area bound as a price bound', () => {
    expect(parsePromptFilters('pisos de más de 100 m2', cities).min_price).toBeUndefined();
  });

  it('extracts the result limit and the price sort', () => {
    expect(parsePromptFilters('muestra las 3 casas más baratas', cities)).toMatchObject({ limit: 3, sort_by: 'price_asc' });
    expect(parsePromptFilters('los pisos más caros', cities).sort_by).toBe('price_desc');
  });
});
