import { isPropertyId, isShareToken } from '../lib/shareLink';
import { supabase } from '../lib/supabase';
import { Property } from '../types/property';

interface SharedListingRow extends Omit<Property, 'id' | 'address' | 'agent_name' | 'contact_whatsapp'> {
  agency_whatsapp?: string | null;
}

export async function createListingShareLink(propertyId: string): Promise<string | null> {
  if (!isPropertyId(propertyId)) return null;

  const { data, error } = await supabase.rpc('create_listing_share_link', { p_property_id: propertyId });
  if (error) throw error;
  return isShareToken(data) ? data : null;
}

export async function fetchSharedListingByToken(token: string): Promise<Property | null> {
  if (!isShareToken(token)) return null;

  const { data, error } = await supabase.rpc('get_shared_listing', { p_token: token });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : null) as SharedListingRow | null;
  if (!row) return null;

  const { agency_whatsapp, ...listing } = row;
  return { ...listing, id: token, address: null, contact_whatsapp: agency_whatsapp ?? null };
}
