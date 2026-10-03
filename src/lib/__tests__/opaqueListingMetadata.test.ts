import { buildOpaqueListingMetadata } from '../listingMetadata';
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
  image_url: 'https://cdn.example.com/cover.jpg',
  images: ['https://cdn.example.com/cover.jpg'],
  amenities: [],
  agency_name: 'Casa Norte',
};

describe('buildOpaqueListingMetadata', () => {
  const metadata = buildOpaqueListingMetadata(SHARED, 'https://hubik.example.app/');

  it('points the canonical and the preview to the opaque link, never to /p', () => {
    expect(metadata.alternates?.canonical).toBe(`https://hubik.example.app/s/${TOKEN}`);
    expect(metadata.openGraph?.url).toBe(`https://hubik.example.app/s/${TOKEN}`);
    expect(JSON.stringify(metadata)).not.toContain('/p/');
  });

  it('keeps the link out of search engines', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('describes the listing by its city, without an address', () => {
    expect(metadata.description).toBe('3 hab. · 2 baños · 220 m² · Valencia');
  });

  it('keeps the rich preview image and title', () => {
    expect(metadata.title).toBe('Casa en El Bosque · $850');
    expect(metadata.openGraph?.images).toEqual([{ url: 'https://cdn.example.com/cover.jpg', alt: 'Casa en El Bosque' }]);
  });
});
