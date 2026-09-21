import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { labels } from '../constants/labels';
import { AUTH_CALLBACK_PATH, extractAuthCode } from '../lib/authCallback';
import { supabase } from '../lib/supabase';
import { isAddAgentOutcome, isValidInviteEmail, normalizeInviteEmail } from '../lib/agentInvites';
import {
  AddAgentOutcome,
  AgencyAgent,
  AgentInvite,
  AuthProviderName,
  Profile,
  Role,
  SignInOutcome,
} from '../types/auth';
import { Property } from '../types/property';

const MIN_AGENCY_NAME_LENGTH = 2;

const LISTING_COLUMNS =
  'id, title, property_type, price, bedrooms, bathrooms, square_meters, city, address, status, image_url, images, amenities, created_at, agency_id, agency_name, agent_name';

interface ProfileRow {
  user_id: string;
  role: Role;
  agency_id: string | null;
  display_name: string | null;
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
    .select('user_id, role, agency_id, display_name')
    .eq('user_id', userId)
    .single<ProfileRow>();
  if (error) throw error;
  if (!data) throw new Error(labels.auth.signInStartError);

  return {
    userId: data.user_id,
    role: data.role,
    agencyId: data.agency_id,
    displayName: data.display_name,
  };
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
