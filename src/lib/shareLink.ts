import { OPAQUE_SHARE_PATH, SHARE_BASE_URL, SHARE_PAGE_PATH } from '../constants/share';
import { SHARE_TOKEN_PATTERN } from '../constants/shareToken';
import { buildListingSlug, isPropertyId } from './listingSlug';

export { isPropertyId };

export function buildShareUrl(listing: { id: string; title: string }, baseUrl: string = SHARE_BASE_URL): string | null {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base.startsWith('https://') || !isPropertyId(listing.id)) return null;
  return `${base}${SHARE_PAGE_PATH}/${buildListingSlug(listing.title, listing.id)}`;
}

export function isShareToken(value: unknown): value is string {
  return typeof value === 'string' && SHARE_TOKEN_PATTERN.test(value);
}

export function buildOpaqueShareUrl(token: string, baseUrl: string = SHARE_BASE_URL): string | null {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base.startsWith('https://') || !isShareToken(token)) return null;
  return `${base}${OPAQUE_SHARE_PATH}/${token}`;
}
