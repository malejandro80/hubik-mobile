import { APP_LINK_SCHEME } from '../constants/appLink';
import { OPAQUE_SHARE_PATH, SHARE_PAGE_PATH } from '../constants/share';
import { buildListingSlug, isPropertyId } from './listingSlug';
import { isShareToken } from './shareLink';

export function buildAppLink(listing: { id: string; title: string }): string | null {
  if (!isPropertyId(listing.id)) return null;
  return `${APP_LINK_SCHEME}:/${SHARE_PAGE_PATH}/${buildListingSlug(listing.title, listing.id)}`;
}

export function buildOpaqueAppLink(token: string): string | null {
  if (!isShareToken(token)) return null;
  return `${APP_LINK_SCHEME}:/${OPAQUE_SHARE_PATH}/${token}`;
}
