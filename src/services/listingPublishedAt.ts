import { supabase } from '../lib/supabase';

export async function fetchListingPublishedAt(id: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('property_listings').select('created_at').eq('id', id).maybeSingle();
    return !error && typeof data?.created_at === 'string' ? data.created_at : null;
  } catch {
    return null;
  }
}
