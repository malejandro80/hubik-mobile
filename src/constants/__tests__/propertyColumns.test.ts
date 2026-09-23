import { LISTING_COLUMNS } from '../propertyColumns';

describe('LISTING_COLUMNS', () => {
  it('reads everything the property detail shows, so preview and published views match', () => {
    const columns = LISTING_COLUMNS.split(',').map((column) => column.trim());
    expect(columns).toEqual(
      expect.arrayContaining([
        'id', 'title', 'property_type', 'operation_type', 'price', 'currency', 'bedrooms',
        'bathrooms', 'square_meters', 'city', 'address', 'latitude', 'longitude', 'description',
        'images', 'image_url', 'amenities', 'agency_name', 'agent_name',
      ])
    );
  });
});
