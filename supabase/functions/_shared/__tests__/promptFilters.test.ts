import { extractOperationType, extractPropertyType, parsePromptFilters } from '../promptFilters';

const cities = ['Ciudad de México', 'Bogotá', 'Valencia'];

describe('extractPropertyType', () => {
  it('detects every property type from Spanish and English synonyms', () => {
    expect(extractPropertyType('piso luminoso')).toBe('Apartment');
    expect(extractPropertyType('condominio con vigilancia')).toBe('Condo');
    expect(extractPropertyType('casa adosada espaciosa')).toBe('Townhouse');
    expect(extractPropertyType('microestudio céntrico')).toBe('Studio');
    expect(extractPropertyType('family home')).toBe('Single Family');
  });

  it('prefers the most specific type when several are mentioned', () => {
    expect(extractPropertyType('apartamento estudio en el centro')).toBe('Studio');
    expect(extractPropertyType('casas adosadas')).toBe('Townhouse');
    expect(extractPropertyType('apartamento en condominio')).toBe('Condo');
  });

  it('returns undefined when no property type is present', () => {
    expect(extractPropertyType('propiedad en valencia')).toBeUndefined();
  });
});

describe('extractOperationType', () => {
  it.each([
    ['casas en alquiler', 'rent'],
    ['quiero alquilar un piso', 'rent'],
    ['apartamento en renta', 'rent'],
    ['busco arriendo', 'rent'],
    ['house for rent', 'rent'],
    ['casas en venta', 'sale'],
    ['quiero comprar un apartamento', 'sale'],
    ['se vende casa', 'sale'],
    ['apartment for sale', 'sale'],
  ])('reads %p as %p', (text, operation) => {
    expect(extractOperationType(text)).toBe(operation);
  });

  it.each(['casa con ventanas grandes', 'casas en Valencia', 'alquiler o venta en Valencia'])('applies no operation to %p', (text) => {
    expect(extractOperationType(text)).toBeUndefined();
  });
});

describe('parsePromptFilters', () => {
  it('adds the operation to the filters', () => {
    expect(parsePromptFilters('apartamentos en alquiler en Valencia', cities)).toEqual({
      city: 'Valencia',
      property_type: 'Apartment',
      operation_type: 'rent',
    });
  });

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
