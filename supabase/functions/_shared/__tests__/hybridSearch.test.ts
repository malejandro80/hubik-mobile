import { buildHybridSearch, contentTerms, suggestionSearchParams } from '../hybridSearch';
import { MIN_SIMILARITY, NEARBY_RADIUS_KM, SIMILARITY_WINDOW, SUGGESTION_COUNT_LIMIT } from '../hybridSearchConstants';

const cities = ['Valencia', 'San Diego'];

describe('contentTerms', () => {
  it('keeps the distinctive words of the request', () => {
    expect(contentTerms('Que tenga planta eléctrica', cities)).toBe('planta electrica');
    expect(contentTerms('algo en Guataparo', cities)).toBe('guataparo');
  });

  it('drops words that only repeat filters: types, operations, rooms, prices, cities and numbers', () => {
    expect(contentTerms('pisos en Valencia', cities)).toBe('');
    expect(contentTerms('casas de 3 habitaciones en San Diego', cities)).toBe('');
    expect(contentTerms('la casa más barata en venta hasta 90000', cities)).toBe('');
  });

  it('drops generic quality adjectives that would match any description', () => {
    expect(contentTerms('con buena señal de internet', cities)).toBe('senal internet');
    expect(contentTerms('excelente y bonito', cities)).toBe('');
  });

  it('drops listing boilerplate like "zona" that appears in most descriptions', () => {
    expect(contentTerms('con zona de juegos para niños', cities)).toBe('juegos ninos');
  });

  it('keeps a feature mentioned next to filter words', () => {
    expect(contentTerms('la casa más barata con jardín', cities)).toBe('jardin');
  });
});

describe('buildHybridSearch', () => {
  const embedding = [0.1, 0.2];

  it('sends the known city and the other filters as hard filters, without amenities', () => {
    const { params } = buildHybridSearch({
      message: 'casas con piscina en Valencia hasta 200000',
      filters: { city: 'Valencia', property_type: 'Single Family', max_price: 200000, amenities: ['piscina'], limit: 5 },
      knownCities: cities,
      embedding,
    });

    expect(params).toEqual({
      query_embedding: embedding,
      p_query: 'piscina',
      p_place: null,
      p_city: 'Valencia',
      p_property_type: 'Single Family',
      p_operation_type: null,
      p_min_price: null,
      p_max_price: 200000,
      p_min_bedrooms: null,
      p_max_bedrooms: null,
      p_min_square_meters: null,
      p_max_square_meters: null,
      p_min_similarity: MIN_SIMILARITY,
      p_similarity_window: SIMILARITY_WINDOW,
      p_sort: null,
      match_count: 5,
    });
  });

  it('sends the operation as a hard filter to every search', () => {
    const { params, cityParams, nearbyParams } = buildHybridSearch({
      message: 'apartamentos en alquiler en Prebo',
      filters: { city: 'Valencia', place: 'Prebo', operation_type: 'rent' },
      knownCities: cities,
      knownSectors: ['Prebo'],
      embedding,
    });

    expect(params.p_operation_type).toBe('rent');
    expect(cityParams.p_operation_type).toBe('rent');
    expect(nearbyParams?.p_operation_type).toBe('rent');
  });

  it('sends area bounds as hard filters', () => {
    const { params } = buildHybridSearch({
      message: 'pisos de entre 80 y 120 m2',
      filters: { property_type: 'Apartment', min_square_meters: 80, max_square_meters: 120 },
      knownCities: cities,
      embedding,
    });

    expect(params.p_min_square_meters).toBe(80);
    expect(params.p_max_square_meters).toBe(120);
  });

  it('sends a known sector as the place without dropping the city, and keeps it out of the content terms', () => {
    const { params, filters } = buildHybridSearch({
      message: 'apartamentos con piscina en La Trigaleña, Valencia',
      filters: { city: 'Valencia', place: 'La Trigaleña' },
      knownCities: cities,
      knownSectors: ['La Trigaleña'],
      embedding,
    });

    expect(params.p_city).toBe('Valencia');
    expect(params.p_place).toBe('La Trigaleña');
    expect(params.p_query).toBe('piscina');
    expect(filters).toEqual({ city: 'Valencia', place: 'La Trigaleña' });
  });

  it('prepares the nearby search with the hard filters and no city', () => {
    const { nearbyParams } = buildHybridSearch({
      message: 'apartamentos en Prebo hasta 50000 de más de 60 m2',
      filters: { city: 'Valencia', place: 'Prebo', property_type: 'Apartment', max_price: 50000, min_square_meters: 60 },
      knownCities: cities,
      knownSectors: ['Prebo'],
      embedding,
    });

    expect(nearbyParams).toEqual({
      p_place: 'Prebo',
      p_radius_km: NEARBY_RADIUS_KM,
      p_property_type: 'Apartment',
      p_operation_type: null,
      p_min_price: null,
      p_max_price: 50000,
      p_min_bedrooms: null,
      p_max_bedrooms: null,
      p_min_square_meters: 60,
      p_max_square_meters: null,
      match_count: 10,
    });
  });

  it('prepares the city search without the place or its name as a content term', () => {
    const { cityParams } = buildHybridSearch({
      message: 'algo con piscina en Guataparo',
      filters: { city: 'Guataparo' },
      knownCities: cities,
      embedding,
    });

    expect(cityParams.p_place).toBeNull();
    expect(cityParams.p_city).toBeNull();
    expect(cityParams.p_query).toBe('piscina');
  });

  it('treats a "city" that has no listings as a place that must appear in the listing text', () => {
    const { params, filters } = buildHybridSearch({
      message: 'algo en Guataparo',
      filters: { city: 'Guataparo' },
      knownCities: cities,
      embedding,
    });

    expect(params.p_city).toBeNull();
    expect(params.p_place).toBe('Guataparo');
    expect(filters).toEqual({ place: 'Guataparo' });
  });

  it('matches known cities regardless of case and accents', () => {
    const { params } = buildHybridSearch({
      message: 'pisos en valencia',
      filters: { city: 'VALENCIA' },
      knownCities: ['Valéncia'],
      embedding,
    });

    expect(params.p_city).toBe('VALENCIA');
    expect(params.p_place).toBeNull();
  });

  it('applies no relevance threshold when the request is only filters', () => {
    const { params } = buildHybridSearch({
      message: 'pisos en Valencia',
      filters: { city: 'Valencia', property_type: 'Apartment' },
      knownCities: cities,
      embedding,
    });

    expect(params.p_query).toBeNull();
    expect(params.p_min_similarity).toBeNull();
    expect(params.p_similarity_window).toBeNull();
  });

  it('passes an explicit price sort through and defaults the result count', () => {
    const { params } = buildHybridSearch({
      message: 'la casa más barata con jardín',
      filters: { sort_by: 'price_asc' },
      knownCities: cities,
      embedding,
    });

    expect(params.p_sort).toBe('price_asc');
    expect(params.match_count).toBe(10);
  });

  it('ignores an unknown sort value', () => {
    const { params } = buildHybridSearch({ message: 'x', filters: { sort_by: 'random' }, knownCities: cities, embedding });

    expect(params.p_sort).toBeNull();
  });

  it('searches by words only when there is no embedding', () => {
    const { params } = buildHybridSearch({ message: 'con jardín', filters: {}, knownCities: cities, embedding: null });

    expect(params.query_embedding).toBeNull();
    expect(params.p_query).toBe('jardin');
  });
});

describe('suggestionSearchParams', () => {
  it('searches only the structured filters, without relevance, place or sort', () => {
    expect(
      suggestionSearchParams({ city: 'Valencia', property_type: 'Apartment', operation_type: 'sale', max_price: 80000, min_bedrooms: 2 })
    ).toEqual({
      query_embedding: null,
      p_query: null,
      p_place: null,
      p_city: 'Valencia',
      p_property_type: 'Apartment',
      p_operation_type: 'sale',
      p_min_price: null,
      p_max_price: 80000,
      p_min_bedrooms: 2,
      p_max_bedrooms: null,
      p_min_square_meters: null,
      p_max_square_meters: null,
      p_min_similarity: null,
      p_similarity_window: null,
      p_sort: null,
      match_count: SUGGESTION_COUNT_LIMIT,
    });
  });
});
