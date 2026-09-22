import { APP_LINK_SCHEME } from '../constants/appLink';
import { SHARE_PAGE_PATH } from '../constants/share';
import { buildListingSlug, isPropertyId } from './listingSlug';

export function buildAppLink(listing: { id: string; title: string }): string | null {
  if (!isPropertyId(listing.id)) return null;
  return `${APP_LINK_SCHEME}:/${SHARE_PAGE_PATH}/${buildListingSlug(listing.title, listing.id)}`;
}
