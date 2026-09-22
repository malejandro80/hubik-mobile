import { resolveOrigin, resolveSharedMetadata } from '../sharedMetadata';
import { fetchSharedPropertyByRef } from '../sharedProperty';

jest.mock('../sharedProperty', () => ({
  fetchSharedPropertyByRef: jest.fn(),
}));

const fetchMock = fetchSharedPropertyByRef as jest.Mock;

const PROPERTY = {
  id: '6ff52f65-00be-4ee2-a304-302a60358d4e',
  title: 'Piso en venta en Madrid',
  property_type: 'Apartment',
  price: 420000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Madrid',
  address: 'Calle Mayor 12',
  status: 'Available',
  image_url: 'https://cdn.example.com/cover.jpg',
  images: [],
  amenities: [],
};

const ORIGIN = 'https://hubik.example.app';

describe('resolveSharedMetadata', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('builds the listing metadata for a slug', async () => {
    fetchMock.mockResolvedValue(PROPERTY);

    const metadata = await resolveSharedMetadata('piso-en-venta-en-madrid-6ff52f65', ORIGIN);

    expect(fetchMock).toHaveBeenCalledWith({
      kind: 'slug',
      slug: 'piso-en-venta-en-madrid-6ff52f65',
      shortId: '6ff52f65',
    });
    expect(metadata.title).toBe('Piso en venta en Madrid · $420,000');
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it('names the slug address as canonical when the visitor arrived by full id', async () => {
    fetchMock.mockResolvedValue(PROPERTY);

    const metadata = await resolveSharedMetadata(PROPERTY.id, ORIGIN);

    expect(metadata.alternates?.canonical).toBe('https://hubik.example.app/p/piso-en-venta-en-madrid-6ff52f65');
  });

  it('keeps a listing that does not exist out of search engines', async () => {
    fetchMock.mockResolvedValue(null);

    const metadata = await resolveSharedMetadata('casa-6ff52f65', ORIGIN);

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe('Propiedad no disponible · Hubik');
  });

  it.each([undefined, '', 'nonsense', "x' or 1=1"])('does not query for %p and stays unindexed', async (value) => {
    const metadata = await resolveSharedMetadata(value, ORIGIN);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('gives neutral, unindexed metadata when the database fails, instead of throwing', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    const metadata = await resolveSharedMetadata('casa-6ff52f65', ORIGIN);

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.openGraph).toBeUndefined();
  });
});

describe('resolveOrigin', () => {
  it('prefers the configured public URL, without trailing slashes', () => {
    expect(resolveOrigin('https://preview--abc.expo.app/p/x', 'https://hubik.example.app//')).toBe('https://hubik.example.app');
  });

  it('falls back to the origin of the request', () => {
    expect(resolveOrigin('https://preview--abc.expo.app/p/x?y=1', '')).toBe('https://preview--abc.expo.app');
  });

  it('ignores a configured URL that is not https', () => {
    expect(resolveOrigin('https://h.app/p/x', 'http://evil.example')).toBe('https://h.app');
  });
});
