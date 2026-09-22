import type { Metadata } from 'expo-server';
import { labels } from '../constants/labels';
import { SHARE_PAGE_PATH } from '../constants/share';
import { Property } from '../types/property';
import { buildListingSlug } from './listingSlug';
import { formatPrice } from './propertyDetail';

const HTTPS_PREFIX = 'https://';

function pickCoverImage(property: Property): string | null {
  const candidates = [...(property.images ?? []), property.image_url];
  return candidates.find((url) => typeof url === 'string' && url.startsWith(HTTPS_PREFIX)) ?? null;
}

export function buildListingUrl(property: Property, origin: string): string {
  return `${origin.trim().replace(/\/+$/, '')}${SHARE_PAGE_PATH}/${buildListingSlug(property.title, property.id)}`;
}

export function buildListingMetadata(property: Property, origin: string): Metadata {
  const { sharedProperty } = labels;
  const title = `${property.title} · ${formatPrice(String(property.price))}`;
  const description = [
    sharedProperty.bedrooms(property.bedrooms),
    sharedProperty.bathrooms(property.bathrooms),
    sharedProperty.area(property.square_meters),
    `${property.address}, ${property.city}`,
  ].join(' · ');
  const url = buildListingUrl(property, origin);
  const image = pickCoverImage(property);

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: sharedProperty.seo.siteName,
      locale: sharedProperty.seo.locale,
      ...(image ? { images: [{ url: image, alt: property.title }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export function buildUnavailableMetadata(): Metadata {
  return {
    title: labels.sharedProperty.seo.unavailableTitle,
    robots: { index: false, follow: false },
  };
}
