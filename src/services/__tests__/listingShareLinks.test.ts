import { supabase } from '../../lib/supabase';
import { createListingShareLink, fetchSharedListingByToken } from '../listingShareLinks';

jest.mock('../../lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

const rpc = supabase.rpc as jest.Mock;
const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';
const LISTING_ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';

const row = {
  title: 'Casa en El Bosque',
  property_type: 'Single Family',
  operation_type: 'rent',
  price: 850,
  currency: 'USD',
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 220,
  city: 'Valencia',
  sector: 'El Bosque',
  latitude: 10.2,
  longitude: -68.0,
  description: 'Casa amplia.',
  status: 'Available',
  image_url: 'https://cdn.example.com/a.jpg',
  images: ['https://cdn.example.com/a.jpg'],
  amenities: ['jardín'],
  agency_name: 'Casa Norte',
  agency_whatsapp: '+584141234567',
};

describe('createListingShareLink', () => {
  beforeEach(() => rpc.mockReset());

  it('asks the server for the listing token', async () => {
    rpc.mockResolvedValue({ data: TOKEN, error: null });

    await expect(createListingShareLink(LISTING_ID)).resolves.toBe(TOKEN);
    expect(rpc).toHaveBeenCalledWith('create_listing_share_link', { p_property_id: LISTING_ID });
  });

  it('gives null when the server refuses or returns something that is not a token', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(createListingShareLink(LISTING_ID)).resolves.toBeNull();

    rpc.mockResolvedValue({ data: '../x', error: null });
    await expect(createListingShareLink(LISTING_ID)).resolves.toBeNull();
  });

  it('throws when the call fails', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('boom') });

    await expect(createListingShareLink(LISTING_ID)).rejects.toThrow('boom');
  });

  it('does not call the server for an id that is not a listing id', async () => {
    await expect(createListingShareLink('draft')).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('fetchSharedListingByToken', () => {
  beforeEach(() => rpc.mockReset());

  it('maps the shared listing with the token as id and the agency as the only contact', async () => {
    rpc.mockResolvedValue({ data: [row], error: null });

    const property = await fetchSharedListingByToken(TOKEN);

    expect(rpc).toHaveBeenCalledWith('get_shared_listing', { p_token: TOKEN });
    expect(property).toMatchObject({
      id: TOKEN,
      title: 'Casa en El Bosque',
      agency_name: 'Casa Norte',
      contact_whatsapp: '+584141234567',
      address: null,
    });
    expect(property?.agent_name).toBeUndefined();
    expect(property?.created_by).toBeUndefined();
  });

  it('gives null for an unknown token', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    await expect(fetchSharedListingByToken(TOKEN)).resolves.toBeNull();
  });

  it('does not call the server for an invalid token', async () => {
    await expect(fetchSharedListingByToken('nope')).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('throws when the call fails', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('down') });

    await expect(fetchSharedListingByToken(TOKEN)).rejects.toThrow('down');
  });
});
