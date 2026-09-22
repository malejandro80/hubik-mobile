import { buildListingMetadata, buildUnavailableMetadata } from '../listingMetadata';
import { Property } from '../../types/property';

const PROPERTY: Property = {
  id: '6ff52f65-00be-4ee2-a304-302a60358d4e',
  title: 'Piso en venta en Madrid',
  property_type: 'Apartment',
  price: 420000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Madrid',
  address: 'Calle Mayor 12',
  description: 'Un piso reformado junto al parque.',
  status: 'Available',
  image_url: 'https://cdn.example.com/cover.jpg',
  images: ['https://cdn.example.com/cover.jpg', 'https://cdn.example.com/second.jpg'],
  amenities: [],
  agency_name: 'Casa Norte',
  agent_name: 'Ana Pérez',
};

const ORIGIN = 'https://hubik.example.app';
const URL_OF = 'https://hubik.example.app/p/piso-en-venta-en-madrid-6ff52f65';

describe('buildListingMetadata', () => {
  it('names the listing and its price in the title', () => {
    const metadata = buildListingMetadata(PROPERTY, ORIGIN);

    expect(metadata.title).toBe('Piso en venta en Madrid · $420,000');
    expect(metadata.openGraph?.title).toBe('Piso en venta en Madrid · $420,000');
    expect(metadata.twitter?.title).toBe('Piso en venta en Madrid · $420,000');
  });

  it('describes bedrooms, bathrooms, area and where it is', () => {
    const { description, openGraph, twitter } = buildListingMetadata(PROPERTY, ORIGIN);

    expect(description).toBe('3 hab. · 2 baños · 90 m² · Calle Mayor 12, Madrid');
    expect(openGraph?.description).toBe(description);
    expect(twitter?.description).toBe(description);
  });

  it('points the canonical and og:url at the readable slug address', () => {
    const metadata = buildListingMetadata(PROPERTY, ORIGIN);

    expect(metadata.alternates?.canonical).toBe(URL_OF);
    expect(metadata.openGraph?.url).toBe(URL_OF);
  });

  it('uses the cover photo for link cards, with the title as alt text', () => {
    const metadata = buildListingMetadata(PROPERTY, ORIGIN);

    expect(metadata.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/cover.jpg', alt: 'Piso en venta en Madrid' }]);
    expect(metadata.twitter?.card).toBe('summary_large_image');
    expect(metadata.twitter?.images).toEqual(['https://cdn.example.com/cover.jpg']);
  });

  it('falls back to image_url when the listing has no image list', () => {
    const metadata = buildListingMetadata({ ...PROPERTY, images: [] }, ORIGIN);

    expect(metadata.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/cover.jpg', alt: 'Piso en venta en Madrid' }]);
  });

  it('lets search engines index and follow', () => {
    expect(buildListingMetadata(PROPERTY, ORIGIN).robots).toEqual({ index: true, follow: true });
  });

  it('marks the page as Spanish and as coming from Hubik', () => {
    const { openGraph } = buildListingMetadata(PROPERTY, ORIGIN);

    expect(openGraph).toEqual(expect.objectContaining({ siteName: 'Hubik', locale: 'es_ES', type: 'website' }));
  });

  it('omits the photo and uses a plain summary card when there is no usable photo', () => {
    const none = buildListingMetadata({ ...PROPERTY, images: [], image_url: '' }, ORIGIN);
    expect(none.openGraph?.images).toBeUndefined();
    expect(none.twitter?.images).toBeUndefined();
    expect(none.twitter?.card).toBe('summary');

    const insecure = buildListingMetadata({ ...PROPERTY, images: ['http://cdn.example.com/a.jpg'], image_url: '' }, ORIGIN);
    expect(insecure.openGraph?.images).toBeUndefined();
    expect(insecure.twitter?.card).toBe('summary');
  });

  it('never emits a non-https photo even when it is listed first', () => {
    const metadata = buildListingMetadata(
      { ...PROPERTY, images: ['javascript:alert(1)', 'https://cdn.example.com/ok.jpg'], image_url: '' },
      ORIGIN
    );

    expect(metadata.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/ok.jpg', alt: 'Piso en venta en Madrid' }]);
  });

  it('ignores trailing slashes on the origin', () => {
    expect(buildListingMetadata(PROPERTY, `${ORIGIN}///`).alternates?.canonical).toBe(URL_OF);
  });

  it('passes hostile text through untouched, leaving escaping to the renderer, without ever building markup', () => {
    const hostile = { ...PROPERTY, title: '"><script>alert(1)</script>', address: "<img src=x onerror='alert(1)'>" };
    const metadata = buildListingMetadata(hostile, ORIGIN);

    expect(metadata.title).toBe('"><script>alert(1)</script> · $420,000');
    expect(metadata.alternates?.canonical).toMatch(/^https:\/\/hubik\.example\.app\/p\/[a-z0-9-]+$/);
  });
});

describe('buildUnavailableMetadata', () => {
  it('tells search engines to stay away and carries no listing data', () => {
    const metadata = buildUnavailableMetadata();

    expect(metadata.title).toBe('Propiedad no disponible · Hubik');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).toBeUndefined();
  });
});
