import { SHARE_BASE_URL, SHARE_PAGE_PATH } from '../constants/share';
import { buildListingSlug, isPropertyId } from './listingSlug';

export { isPropertyId };

export function buildShareUrl(listing: { id: string; title: string }, baseUrl: string = SHARE_BASE_URL): string | null {
  const base = baseUrl.trim().replace(/\/+$/, '');
  if (!base.startsWith('https://') || !isPropertyId(listing.id)) return null;
  return `${base}${SHARE_PAGE_PATH}/${buildListingSlug(listing.title, listing.id)}`;
}
