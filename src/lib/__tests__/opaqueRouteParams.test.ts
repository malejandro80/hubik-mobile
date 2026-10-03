import { buildOpaqueRouteParams } from '../opaqueRouteParams';
import { Property } from '../../types/property';

const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';

const SHARED: Property = {
  id: TOKEN,
  title: 'Casa en El Bosque',
  property_type: 'Single Family',
  price: 850,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 220,
  city: 'Valencia',
  address: null,
  status: 'Available',
  image_url: 'https://cdn.example.com/a.jpg',
  images: [],
  amenities: [],
  agency_name: 'Casa Norte',
  contact_whatsapp: '+584141234567',
};

describe('buildOpaqueRouteParams', () => {
  it('marks the detail as opened from a shared link, with the agency as the contact', () => {
    expect(buildOpaqueRouteParams(SHARED)).toMatchObject({
      id: TOKEN,
      shared: '1',
      agency_name: 'Casa Norte',
      whatsapp: '+584141234567',
    });
  });

  it('never carries an agent name, even if one slipped into the listing', () => {
    const params = buildOpaqueRouteParams({ ...SHARED, agent_name: 'Ana Pérez' });

    expect(params).not.toHaveProperty('agent_name');
  });

  it('carries no contact when the agency has no WhatsApp', () => {
    expect(buildOpaqueRouteParams({ ...SHARED, contact_whatsapp: null })).not.toHaveProperty('whatsapp');
  });
});
