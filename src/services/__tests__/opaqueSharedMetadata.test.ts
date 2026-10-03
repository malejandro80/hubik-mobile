import { resolveOpaqueSharedMetadata } from '../sharedMetadata';
import { fetchSharedListingByToken } from '../listingShareLinks';

jest.mock('../listingShareLinks', () => ({
  fetchSharedListingByToken: jest.fn(),
}));

jest.mock('../sharedProperty', () => ({
  fetchSharedPropertyByRef: jest.fn(),
}));

const fetchMock = fetchSharedListingByToken as jest.Mock;
const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';
const ORIGIN = 'https://hubik.example.app';

const SHARED = {
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
  image_url: '',
  images: [],
  amenities: [],
};

describe('resolveOpaqueSharedMetadata', () => {
  beforeEach(() => fetchMock.mockReset());

  it('describes the shared listing behind its opaque link', async () => {
    fetchMock.mockResolvedValue(SHARED);

    const metadata = await resolveOpaqueSharedMetadata(TOKEN, ORIGIN);

    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/s/${TOKEN}`);
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('falls back to the unavailable page for unknown, invalid or failing tokens', async () => {
    fetchMock.mockResolvedValue(null);
    expect((await resolveOpaqueSharedMetadata(TOKEN, ORIGIN)).robots).toEqual({ index: false, follow: false });

    fetchMock.mockRejectedValue(new Error('down'));
    expect((await resolveOpaqueSharedMetadata(TOKEN, ORIGIN)).alternates).toBeUndefined();

    fetchMock.mockReset();
    expect((await resolveOpaqueSharedMetadata('nope', ORIGIN)).alternates).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
