import { buildPropertyRouteParams } from '../chatRegistration';
import { Property } from '../../types/property';

const property: Property = {
  id: 'prop-1',
  title: 'Chalet',
  property_type: 'Single Family',
  price: 600000,
  bedrooms: 4,
  bathrooms: 3,
  square_meters: 250,
  city: 'Madrid',
  address: 'Calle Roble',
  image_url: 'https://example.com/img.jpg',
  images: [],
  amenities: [],
  status: 'Available',
};

describe('buildPropertyRouteParams attribution', () => {
  it('passes the agency and agent names to the detail screen when present', () => {
    const params = buildPropertyRouteParams({
      ...property,
      agency_name: 'Casa Norte',
      agent_name: 'Ana',
    });

    expect(params.agency_name).toBe('Casa Norte');
    expect(params.agent_name).toBe('Ana');
  });

  it('omits the attribution params when the property has none', () => {
    const params = buildPropertyRouteParams({ ...property, agency_name: null, agent_name: null });

    expect(params).not.toHaveProperty('agency_name');
    expect(params).not.toHaveProperty('agent_name');
  });
});
