import { buildHybridSearch, contentTerms } from '../hybridSearch';
import { MIN_SIMILARITY, SIMILARITY_WINDOW } from '../hybridSearchConstants';

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
      p_min_price: null,
      p_max_price: 200000,
      p_min_bedrooms: null,
      p_max_bedrooms: null,
      p_min_similarity: MIN_SIMILARITY,
      p_similarity_window: SIMILARITY_WINDOW,
      p_sort: null,
      match_count: 5,
    });
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
