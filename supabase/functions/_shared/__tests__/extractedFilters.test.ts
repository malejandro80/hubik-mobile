import { sanitizeExtractedFilters } from '../extractedFilters';

describe('sanitizeExtractedFilters', () => {
  it('keeps valid filters', () => {
    expect(
      sanitizeExtractedFilters({
        city: ' Valencia ',
        property_type: 'Apartment',
        operation_type: 'rent',
        min_price: 100,
        max_price: 900,
        min_bedrooms: 2,
        max_bedrooms: 3,
        min_square_meters: 50,
        max_square_meters: 90,
        limit: 5,
        sort_by: 'price_asc',
        amenities: ['piscina', 'garaje'],
      })
    ).toEqual({
      city: 'Valencia',
      property_type: 'Apartment',
      operation_type: 'rent',
      min_price: 100,
      max_price: 900,
      min_bedrooms: 2,
      max_bedrooms: 3,
      min_square_meters: 50,
      max_square_meters: 90,
      limit: 5,
      sort_by: 'price_asc',
      amenities: ['piscina', 'garaje'],
    });
  });

  it('drops values outside the allowed sets', () => {
    expect(
      sanitizeExtractedFilters({
        property_type: 'Castle',
        operation_type: 'lease',
        sort_by: 'random',
        min_price: -5,
        max_price: 'mucho',
        limit: 1000,
        amenities: ['piscina', 42, ''],
        city: '',
        extra: 'x',
      })
    ).toEqual({ amenities: ['piscina'] });
  });

  it('returns no filters for anything that is not an object', () => {
    expect(sanitizeExtractedFilters(null)).toEqual({});
    expect(sanitizeExtractedFilters(['Apartment'])).toEqual({});
    expect(sanitizeExtractedFilters('Apartment')).toEqual({});
  });
});
