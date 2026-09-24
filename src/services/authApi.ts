import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { labels } from '../constants/labels';
import { AUTH_CALLBACK_PATH, extractAuthCode } from '../lib/authCallback';
import { supabase } from '../lib/supabase';
import { LISTING_COLUMNS } from '../constants/propertyColumns';
import { isAddAgentOutcome, isValidInviteEmail, normalizeInviteEmail } from '../lib/agentInvites';
import {
  isRateLimitedError,
  normalizeClientQuery,
  RateLimitedError,
  shouldSearchClients,
  toClientCandidates,
} from '../lib/clientSearch';
import {
  AddAgentOutcome,
  AgencyAgent,
  AgentInvite,
  AuthProviderName,
  ClientCandidate,
  Profile,
  PropertyLandlord,
  Role,
  SignInOutcome,
} from '../types/auth';
import { Property } from '../types/property';

const MIN_AGENCY_NAME_LENGTH = 2;

interface ProfileRow {
  user_id: string;
  role: Role;
  agency_id: string | null;
  display_name: string | null;
  whatsapp: string | null;
}

export async function signInWithProvider(provider: AuthProviderName): Promise<SignInOutcome> {
  const redirectTo = Linking.createURL(AUTH_CALLBACK_PATH);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error(labels.auth.signInStartError);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return 'cancelled';

  const code = extractAuthCode(result.url);
  if (!code) throw new Error(labels.auth.signInMissingCodeError);

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;

  return 'signedIn';
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, role, agency_id, display_name, whatsapp')
    .eq('user_id', userId)
    .single<ProfileRow>();
  if (error) throw error;
  if (!data) throw new Error(labels.auth.signInStartError);

  return {
    userId: data.user_id,
    role: data.role,
    agencyId: data.agency_id,
    displayName: data.display_name,
    whatsapp: data.whatsapp ?? null,
  };
}

async function updateWhatsApp(table: 'profiles' | 'agencies', key: 'user_id' | 'id', id: string, phone: string | null) {
  const { data, error } = await supabase.from(table).update({ whatsapp: phone }).eq(key, id).select('whatsapp');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(labels.whatsapp.saveError);
}

export function updateMyWhatsApp(userId: string, phone: string | null): Promise<void> {
  return updateWhatsApp('profiles', 'user_id', userId, phone);
}

export function updateAgencyWhatsApp(agencyId: string, phone: string | null): Promise<void> {
  return updateWhatsApp('agencies', 'id', agencyId, phone);
}

export async function fetchAgencyWhatsApp(agencyId: string): Promise<string | null> {
  const { data, error } = await supabase.from('agencies').select('whatsapp').eq('id', agencyId).maybeSingle();
  if (error || !data) return null;
  return data.whatsapp ?? null;
}

export async function createAgency(name: string): Promise<string> {
  const trimmedName = name.trim();
  if (trimmedName.length < MIN_AGENCY_NAME_LENGTH) {
    throw new Error(labels.auth.agencyNameRequired);
  }

  const { data, error } = await supabase.rpc('create_agency', { p_name: trimmedName });
  if (error) throw error;
  return data as string;
}

export async function fetchAgencyName(agencyId: string): Promise<string | null> {
  const { data, error } = await supabase.from('agencies').select('name').eq('id', agencyId).maybeSingle();
  if (error || !data) return null;
  return data.name;
}

export async function fetchAgencyListings(agencyId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('property_listings')
    .select(LISTING_COLUMNS)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Property[];
}

interface AgentRow {
  user_id: string;
  display_name: string | null;
}

interface InviteRow {
  id: string;
  email: string;
  created_at: string;
}

export async function addAgent(email: string): Promise<AddAgentOutcome> {
  if (!isValidInviteEmail(email)) throw new Error(labels.auth.agents.errors.invalid_email);

  const { data, error } = await supabase.rpc('add_agent', { p_email: normalizeInviteEmail(email) });
  if (error) throw error;
  if (!isAddAgentOutcome(data)) throw new Error(labels.auth.agents.errors.generic);
  return data;
}

export async function searchAgentCandidates(query: string): Promise<ClientCandidate[]> {
  if (!shouldSearchClients(query)) return [];

  const { data, error } = await supabase.rpc('search_agent_candidates', { p_query: normalizeClientQuery(query) });
  if (error) throw isRateLimitedError(error) ? new RateLimitedError() : error;
  return toClientCandidates(data);
}

export async function searchLandlordCandidates(query: string): Promise<ClientCandidate[]> {
  if (!shouldSearchClients(query)) return [];

  const { data, error } = await supabase.rpc('search_landlord_candidates', { p_query: normalizeClientQuery(query) });
  if (error) throw isRateLimitedError(error) ? new RateLimitedError() : error;
  return toClientCandidates(data);
}

export async function fetchPropertyLandlord(propertyId: string): Promise<PropertyLandlord | null> {
  const { data, error } = await supabase.rpc('get_property_landlord', { p_property_id: propertyId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { displayName: row.display_name ?? null, email: row.email } : null;
}

export async function addAgentById(userId: string): Promise<AddAgentOutcome> {
  const { data, error } = await supabase.rpc('add_agent_by_id', { p_user_id: userId });
  if (error) throw error;
  if (!isAddAgentOutcome(data)) throw new Error(labels.auth.agents.errors.generic);
  return data;
}

export async function cancelAgentInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_agent_invite', { p_invite_id: inviteId });
  if (error) throw error;
}

export async function fetchAgencyAgents(agencyId: string): Promise<AgencyAgent[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .eq('agency_id', agencyId)
    .eq('role', 'agent')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as AgentRow[]).map((row) => ({ userId: row.user_id, displayName: row.display_name }));
}

export async function fetchAgentInvites(agencyId: string): Promise<AgentInvite[]> {
  const { data, error } = await supabase
    .from('agent_invites')
    .select('id, email, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as InviteRow[]).map((row) => ({ id: row.id, email: row.email, createdAt: row.created_at }));
}
