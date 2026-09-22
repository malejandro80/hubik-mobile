import type { Metadata } from 'expo-server';
import { SHARE_BASE_URL } from '../constants/share';
import { buildListingMetadata, buildUnavailableMetadata } from '../lib/listingMetadata';
import { parseListingRef } from '../lib/listingSlug';
import { fetchSharedPropertyByRef } from './sharedProperty';

export function resolveOrigin(requestUrl: string, configured: string = SHARE_BASE_URL): string {
  const base = configured.trim().replace(/\/+$/, '');
  return base.startsWith('https://') ? base : new URL(requestUrl).origin;
}

export async function resolveSharedMetadata(value: string | undefined, origin: string): Promise<Metadata> {
  const ref = parseListingRef(value);
  if (!ref) return buildUnavailableMetadata();

  try {
    const property = await fetchSharedPropertyByRef(ref);
    return property ? buildListingMetadata(property, origin) : buildUnavailableMetadata();
  } catch {
    return buildUnavailableMetadata();
  }
}
