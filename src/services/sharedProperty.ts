import { SITEMAP_MAX_ENTRIES } from '../constants/sitemap';
import { buildListingSlug, isPropertyId, ListingRef } from '../lib/listingSlug';
import { SitemapListing } from '../lib/sitemap';
import { supabase } from '../lib/supabase';
import { Property } from '../types/property';

export const SHARED_PROPERTY_COLUMNS =
  'id, title, property_type, operation_type, price, bedrooms, bathrooms, square_meters, city, address, description, status, image_url, images, amenities, agency_name, agent_name';

export async function fetchSharedProperty(id: string): Promise<Property | null> {
  if (!isPropertyId(id)) return null;

  const { data, error } = await supabase
    .from('property_listings')
    .select(SHARED_PROPERTY_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Property | null) ?? null;
}

const SHORT_ID_PATTERN = /^[0-9a-f]{8}$/;
const UUID_TAIL_MIN = '-0000-0000-0000-000000000000';
const UUID_TAIL_MAX = '-ffff-ffff-ffff-ffffffffffff';

export async function fetchSharedPropertyByRef(ref: ListingRef): Promise<Property | null> {
  if (ref.kind === 'id') return fetchSharedProperty(ref.id);
  if (!SHORT_ID_PATTERN.test(ref.shortId)) return null;

  const { data, error } = await supabase
    .from('property_listings')
    .select(SHARED_PROPERTY_COLUMNS)
    .gte('id', `${ref.shortId}${UUID_TAIL_MIN}`)
    .lte('id', `${ref.shortId}${UUID_TAIL_MAX}`)
    .limit(2);
  if (error) throw error;

  const rows = (data ?? []) as Property[];
  if (rows.length <= 1) return rows[0] ?? null;
  return rows.find((row) => buildListingSlug(row.title, row.id) === ref.slug) ?? null;
}

export async function fetchSitemapListings(): Promise<SitemapListing[]> {
  const { data, error } = await supabase
    .from('property_listings')
    .select('id, title, created_at')
    .eq('status', 'Available')
    .order('created_at', { ascending: false })
    .limit(SITEMAP_MAX_ENTRIES);
  if (error) throw error;
  return (data ?? []) as SitemapListing[];
}

