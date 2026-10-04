import { contentTerms } from '../hybridSearch';
import { parsePromptFilters } from '../promptFilters';
import { alternativesAnswer, describeSearch, findAlternatives, SuggestionFilters, suggestionFilters } from '../searchSuggestions';
import { MAX_QUOTED_SEARCH_LENGTH } from '../searchSuggestionsConstants';

const cities = ['Valencia', 'Maracay', 'Caracas'];

type Row = Record<string, unknown>;

const listings: Row[] = [
  { city: 'Maracay', property_type: 'Apartment', operation_type: 'sale', price: 60000, bedrooms: 2 },
  { city: 'Maracay', property_type: 'Single Family', operation_type: 'rent', price: 500, bedrooms: 3 },
  { city: 'Valencia', property_type: 'Apartment', operation_type: 'rent', price: 400, bedrooms: 2 },
  { city: 'Valencia', property_type: 'Apartment', operation_type: 'rent', price: 450, bedrooms: 1 },
  { city: 'Caracas', property_type: 'Apartment', operation_type: 'rent', price: 700, bedrooms: 2 },
];

const fakeSearch = async (filters: SuggestionFilters): Promise<Row[]> =>
  listings.filter(
    (row) =>
      (!filters.city || row.city === filters.city) &&
      (!filters.property_type || row.property_type === filters.property_type) &&
      (!filters.operation_type || row.operation_type === filters.operation_type) &&
      (filters.min_price === undefined || (row.price as number) >= filters.min_price) &&
      (filters.max_price === undefined || (row.price as number) <= filters.max_price) &&
      (filters.min_bedrooms === undefined || (row.bedrooms as number) >= filters.min_bedrooms)
  );

describe('describeSearch', () => {
  it('writes the filters as a search phrase', () => {
    expect(describeSearch({ city: 'Valencia', property_type: 'Apartment', operation_type: 'sale' })).toBe(
      'Apartamentos en venta en Valencia'
    );
    expect(describeSearch({ operation_type: 'rent' })).toBe('Propiedades en alquiler');
    expect(describeSearch({ city: 'Maracay', min_bedrooms: 3, min_price: 50000, max_price: 90000 })).toBe(
      'Propiedades en Maracay de 3 habitaciones desde 50000 hasta 90000'
    );
  });

  it.each<SuggestionFilters>([
    { city: 'Valencia', property_type: 'Apartment', operation_type: 'sale' },
    { city: 'Caracas', property_type: 'Single Family', operation_type: 'rent', max_price: 800 },
    { property_type: 'Townhouse', operation_type: 'sale', min_bedrooms: 2 },
    { property_type: 'Studio', operation_type: 'rent' },
    { property_type: 'Condo', min_price: 50000, max_price: 120000 },
    { city: 'Maracay' },
  ])('is read back by the prompt parser as the same filters, with no extra search terms: %p', (filters) => {
    const phrase = describeSearch(filters);

    expect(parsePromptFilters(phrase, cities)).toEqual(filters);
    expect(contentTerms(phrase, cities)).toBe('');
  });
});

describe('suggestionFilters', () => {
  it('keeps the structured filters a suggestion can express, and only a known city', () => {
    expect(
      suggestionFilters(
        { city: 'Valencia', place: 'Prebo', property_type: 'Apartment', operation_type: 'rent', max_price: 500, min_bedrooms: 2, amenities: ['piscina'], limit: 5 },
        cities
      )
    ).toEqual({ city: 'Valencia', property_type: 'Apartment', operation_type: 'rent', max_price: 500, min_bedrooms: 2 });
    expect(suggestionFilters({ city: 'Guataparo', operation_type: 'sale' }, cities)).toEqual({ operation_type: 'sale' });
  });
});

describe('findAlternatives', () => {
  it('relaxes one filter at a time and keeps only the searches with results', async () => {
    const alternatives = await findAlternatives({
      filters: { city: 'Maracay', property_type: 'Apartment', operation_type: 'rent' },
      knownCities: cities,
      search: fakeSearch,
    });

    expect(alternatives).toEqual([
      { label: 'Apartamentos en venta en Maracay', count: 1 },
      { label: 'Propiedades en alquiler en Maracay', count: 1 },
      { label: 'Apartamentos en alquiler en Valencia', count: 2 },
    ]);
  });

  it('suggests the structured search without the extra terms first', async () => {
    const alternatives = await findAlternatives({
      filters: { city: 'Valencia', property_type: 'Apartment', operation_type: 'rent' },
      knownCities: cities,
      search: fakeSearch,
    });

    expect(alternatives[0]).toEqual({ label: 'Apartamentos en alquiler en Valencia', count: 2 });
  });

  it('drops the price range or the bedrooms when they leave nothing', async () => {
    const alternatives = await findAlternatives({
      filters: { city: 'Valencia', property_type: 'Apartment', max_price: 100, min_bedrooms: 2 },
      knownCities: cities,
      search: fakeSearch,
    });

    expect(alternatives.map((alternative) => alternative.label)).toEqual(['Apartamentos en Valencia de 2 habitaciones']);
  });

  it('offers other cities for the same search, the ones with most results first', async () => {
    const alternatives = await findAlternatives({
      filters: { city: 'Maracay', property_type: 'Apartment', operation_type: 'rent', min_bedrooms: 2 },
      knownCities: cities,
      search: async (filters) => (filters.city === 'Maracay' ? [] : fakeSearch(filters)),
    });

    expect(alternatives).toEqual([
      { label: 'Apartamentos en alquiler en Valencia de 2 habitaciones', count: 1 },
      { label: 'Apartamentos en alquiler en Caracas de 2 habitaciones', count: 1 },
    ]);
  });

  it('returns at most three suggestions', async () => {
    const alternatives = await findAlternatives({
      filters: { city: 'Maracay', property_type: 'Studio', operation_type: 'rent', max_price: 10, min_bedrooms: 5 },
      knownCities: cities,
      search: async () => listings,
    });

    expect(alternatives).toHaveLength(3);
  });

  it('treats a failing search as no results', async () => {
    const alternatives = await findAlternatives({
      filters: { city: 'Maracay', operation_type: 'rent' },
      knownCities: cities,
      search: async () => {
        throw new Error('rpc down');
      },
    });

    expect(alternatives).toEqual([]);
  });
});

describe('alternativesAnswer', () => {
  it('quotes the search that found nothing and lists the alternatives with their counts as suggestions', () => {
    const answer = alternativesAnswer('casa adosada en alquiler en Maracay', [
      { label: 'Casas adosadas en alquiler', count: 2 },
      { label: 'Propiedades en alquiler', count: 10 },
    ]);

    expect(answer).toEqual({
      answer:
        'No encontré resultados exactos para «casa adosada en alquiler en Maracay». Sí hay resultados para: Casas adosadas en alquiler (2), Propiedades en alquiler (10).',
      suggestions: ['Casas adosadas en alquiler', 'Propiedades en alquiler'],
    });
  });

  it('shortens a long search in the quote', () => {
    const answer = alternativesAnswer(`  ${'casa '.repeat(40)} `, [{ label: 'Casas', count: 3 }]).answer;

    expect(answer.indexOf('»') - answer.indexOf('«') - 1).toBeLessThanOrEqual(MAX_QUOTED_SEARCH_LENGTH);
    expect(answer).toContain('…»');
  });
});
