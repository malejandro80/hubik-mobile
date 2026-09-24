import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import {
  addAgent,
  addAgentById,
  cancelAgentInvite,
  createAgency,
  fetchAgencyAgents,
  fetchAgencyListings,
  fetchAgencyName,
  fetchAgencyWhatsApp,
  fetchAgentInvites,
  fetchProfile,
  fetchPropertyLandlord,
  searchAgentCandidates,
  searchLandlordCandidates,
  signInWithProvider,
  signOut,
  updateAgencyWhatsApp,
  updateMyWhatsApp,
} from '../authApi';
import { LISTING_COLUMNS } from '../../constants/propertyColumns';

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'hubikmobile://auth/callback'),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const auth = supabase.auth as unknown as {
  signInWithOAuth: jest.Mock;
  exchangeCodeForSession: jest.Mock;
  signOut: jest.Mock;
};
const openAuthSession = WebBrowser.openAuthSessionAsync as jest.Mock;

describe('authApi.signInWithProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs the PKCE flow in the auth browser and exchanges the returned code', async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example/authorize' },
      error: null,
    });
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'hubikmobile://auth/callback?code=abc123',
    });
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });

    const outcome = await signInWithProvider('google');

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'hubikmobile://auth/callback', skipBrowserRedirect: true },
    });
    expect(openAuthSession).toHaveBeenCalledWith(
      'https://provider.example/authorize',
      'hubikmobile://auth/callback'
    );
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(outcome).toBe('signedIn');
  });

  it('returns cancelled without exchanging when the user closes the browser', async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example/authorize' },
      error: null,
    });
    openAuthSession.mockResolvedValue({ type: 'cancel' });

    const outcome = await signInWithProvider('apple');

    expect(outcome).toBe('cancelled');
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('throws when the callback has no code', async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example/authorize' },
      error: null,
    });
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'hubikmobile://auth/callback?error=access_denied',
    });

    await expect(signInWithProvider('google')).rejects.toThrow();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('throws when Supabase cannot start the flow', async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: new Error('provider disabled') });

    await expect(signInWithProvider('apple')).rejects.toThrow('provider disabled');
    expect(openAuthSession).not.toHaveBeenCalled();
  });

  it('throws when the code exchange fails', async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://provider.example/authorize' },
      error: null,
    });
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'hubikmobile://auth/callback?code=abc123',
    });
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('bad code') });

    await expect(signInWithProvider('google')).rejects.toThrow('bad code');
  });
});

describe('authApi.signOut', () => {
  it('signs out of Supabase', async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('throws when Supabase reports an error', async () => {
    auth.signOut.mockResolvedValue({ error: new Error('offline') });
    await expect(signOut()).rejects.toThrow('offline');
  });
});

describe('authApi.fetchProfile', () => {
  it('maps the profile row to the client shape', async () => {
    const single = jest.fn().mockResolvedValue({
      data: { user_id: 'u1', role: 'agent', agency_id: 'a1', display_name: 'Ana', whatsapp: '+584141234567' },
      error: null,
    });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const profile = await fetchProfile('u1');

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('user_id, role, agency_id, display_name, whatsapp');
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(profile).toEqual({
      userId: 'u1',
      role: 'agent',
      agencyId: 'a1',
      displayName: 'Ana',
      whatsapp: '+584141234567',
    });
  });

  it('throws when the profile cannot be read', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: new Error('no row') });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ single }) }),
    });

    await expect(fetchProfile('u1')).rejects.toThrow('no row');
  });
});

describe('authApi.createAgency', () => {
  it('calls the create_agency function with the trimmed name and returns the id', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: 'agency-1', error: null });

    const id = await createAgency('  Casa Norte  ');

    expect(supabase.rpc).toHaveBeenCalledWith('create_agency', { p_name: 'Casa Norte' });
    expect(id).toBe('agency-1');
  });

  it('rejects a blank name without calling the backend', async () => {
    (supabase.rpc as jest.Mock).mockClear();
    await expect(createAgency('   ')).rejects.toThrow();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('throws the database message when the function fails', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error('only clients can create an agency'),
    });
    await expect(createAgency('Casa Norte')).rejects.toThrow('only clients can create an agency');
  });
});

describe('authApi.fetchAgencyName', () => {
  it('reads the agency name by id', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { name: 'Casa Norte' }, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    await expect(fetchAgencyName('a1')).resolves.toBe('Casa Norte');
    expect(supabase.from).toHaveBeenCalledWith('agencies');
    expect(select).toHaveBeenCalledWith('name');
    expect(eq).toHaveBeenCalledWith('id', 'a1');
  });

  it('returns null when the agency is missing or the lookup fails', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: new Error('boom') });
    (supabase.from as jest.Mock).mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });

    await expect(fetchAgencyName('a1')).resolves.toBeNull();
  });
});

describe('authApi.fetchAgencyListings', () => {
  it('reads the agency listings newest first from the listings view', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const listings = await fetchAgencyListings('a1');

    expect(supabase.from).toHaveBeenCalledWith('property_listings');
    expect(eq).toHaveBeenCalledWith('agency_id', 'a1');
    expect(select).toHaveBeenCalledWith(LISTING_COLUMNS);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(listings).toEqual([{ id: 'p1' }]);
  });

  it('throws when the query fails', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: new Error('boom') });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ order }) }),
    });

    await expect(fetchAgencyListings('a1')).rejects.toThrow('boom');
  });
});

describe('authApi.addAgent', () => {
  beforeEach(() => {
    (supabase.rpc as jest.Mock).mockReset();
  });

  it.each(['agent_added', 'invited', 'already_listed', 'unavailable'])(
    'calls add_agent with the normalised email and returns %s',
    async (outcome) => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: outcome, error: null });

      await expect(addAgent('  Ana@Correo.COM ')).resolves.toBe(outcome);

      expect(supabase.rpc).toHaveBeenCalledWith('add_agent', { p_email: 'ana@correo.com' });
    }
  );

  it('rejects a malformed email without calling the backend', async () => {
    await expect(addAgent('not-an-email')).rejects.toThrow();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('throws the database message when the function fails', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('Only agency owners can add agents') });

    await expect(addAgent('ana@correo.com')).rejects.toThrow('Only agency owners can add agents');
  });

  it('refuses an unexpected server answer instead of trusting it', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: 'something_else', error: null });

    await expect(addAgent('ana@correo.com')).rejects.toThrow();
  });
});

describe('authApi.searchAgentCandidates', () => {
  beforeEach(() => {
    (supabase.rpc as jest.Mock).mockReset();
  });

  it('calls search_agent_candidates with the trimmed text and maps the rows', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [
        { user_id: 'u1', display_name: 'Ana García', masked_email: 'a***@gmail.com' },
        { user_id: 'u2', display_name: null, masked_email: 'n***@correo.com' },
      ],
      error: null,
    });

    await expect(searchAgentCandidates('  ana ')).resolves.toEqual([
      { userId: 'u1', displayName: 'Ana García', maskedEmail: 'a***@gmail.com' },
      { userId: 'u2', displayName: null, maskedEmail: 'n***@correo.com' },
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith('search_agent_candidates', { p_query: 'ana' });
  });

  it('does not call the backend below the minimum length', async () => {
    await expect(searchAgentCandidates(' an ')).resolves.toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('returns an empty list when the server returns nothing', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

    await expect(searchAgentCandidates('zzz')).resolves.toEqual([]);
  });

  it('reports the rate limit as a recognisable error', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'rate_limited', code: 'P0001' } });

    await expect(searchAgentCandidates('ana')).rejects.toMatchObject({ name: 'RateLimitedError' });
  });

  it('throws other database errors as they are', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('Only agency owners can search clients') });

    await expect(searchAgentCandidates('ana')).rejects.toThrow('Only agency owners can search clients');
  });

  it('drops rows that do not look like candidates instead of trusting them', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ user_id: 'u1', display_name: 'Ana', masked_email: 'a***@x.com' }, { nope: true }, null],
      error: null,
    });

    await expect(searchAgentCandidates('ana')).resolves.toEqual([
      { userId: 'u1', displayName: 'Ana', maskedEmail: 'a***@x.com' },
    ]);
  });
});

describe('authApi.addAgentById', () => {
  beforeEach(() => {
    (supabase.rpc as jest.Mock).mockReset();
  });

  it.each(['agent_added', 'already_listed', 'unavailable'])('calls add_agent_by_id and returns %s', async (outcome) => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: outcome, error: null });

    await expect(addAgentById('user-1')).resolves.toBe(outcome);

    expect(supabase.rpc).toHaveBeenCalledWith('add_agent_by_id', { p_user_id: 'user-1' });
  });

  it('throws the database message when the function fails', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('Only agency owners can add agents') });

    await expect(addAgentById('user-1')).rejects.toThrow('Only agency owners can add agents');
  });

  it('refuses an unexpected server answer instead of trusting it', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: 'something_else', error: null });

    await expect(addAgentById('user-1')).rejects.toThrow();
  });
});

describe('authApi.cancelAgentInvite', () => {
  it('calls cancel_agent_invite with the invite id', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

    await cancelAgentInvite('invite-1');

    expect(supabase.rpc).toHaveBeenCalledWith('cancel_agent_invite', { p_invite_id: 'invite-1' });
  });

  it('throws when the function fails', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: new Error('Invite not found') });

    await expect(cancelAgentInvite('invite-1')).rejects.toThrow('Invite not found');
  });
});

describe('authApi.fetchAgencyAgents', () => {
  it('reads the agents of the agency, oldest first, and maps them', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { user_id: 'u1', display_name: 'Ana' },
        { user_id: 'u2', display_name: null },
      ],
      error: null,
    });
    const eqRole = jest.fn(() => ({ order }));
    const eqAgency = jest.fn(() => ({ eq: eqRole }));
    const select = jest.fn(() => ({ eq: eqAgency }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const agents = await fetchAgencyAgents('a1');

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('user_id, display_name');
    expect(eqAgency).toHaveBeenCalledWith('agency_id', 'a1');
    expect(eqRole).toHaveBeenCalledWith('role', 'agent');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(agents).toEqual([
      { userId: 'u1', displayName: 'Ana' },
      { userId: 'u2', displayName: null },
    ]);
  });

  it('throws when the query fails', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: new Error('boom') });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ order }) }) }),
    });

    await expect(fetchAgencyAgents('a1')).rejects.toThrow('boom');
  });
});

describe('authApi.fetchAgentInvites', () => {
  it('reads the pending invites of the agency, newest first, and maps them', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'i1', email: 'ana@correo.com', created_at: '2026-09-21T10:00:00Z' }],
      error: null,
    });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const invites = await fetchAgentInvites('a1');

    expect(supabase.from).toHaveBeenCalledWith('agent_invites');
    expect(select).toHaveBeenCalledWith('id, email, created_at');
    expect(eq).toHaveBeenCalledWith('agency_id', 'a1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(invites).toEqual([{ id: 'i1', email: 'ana@correo.com', createdAt: '2026-09-21T10:00:00Z' }]);
  });

  it('throws when the query fails', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: new Error('boom') });
    (supabase.from as jest.Mock).mockReturnValue({ select: () => ({ eq: () => ({ order }) }) });

    await expect(fetchAgentInvites('a1')).rejects.toThrow('boom');
  });
});

describe('authApi WhatsApp numbers', () => {
  beforeEach(() => jest.clearAllMocks());

  const updateChain = (result: { data: unknown; error: unknown }) => {
    const select = jest.fn().mockResolvedValue(result);
    const eq = jest.fn(() => ({ select }));
    const update = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ update });
    return { update, eq, select };
  };

  it('saves the agent own number on their profile', async () => {
    const { update, eq } = updateChain({ data: [{ whatsapp: '+584141234567' }], error: null });

    await updateMyWhatsApp('u1', '+584141234567');

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(update).toHaveBeenCalledWith({ whatsapp: '+584141234567' });
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('clears the number with null', async () => {
    const { update } = updateChain({ data: [{ whatsapp: null }], error: null });

    await updateMyWhatsApp('u1', null);

    expect(update).toHaveBeenCalledWith({ whatsapp: null });
  });

  it('fails when nothing was updated (not allowed)', async () => {
    updateChain({ data: [], error: null });

    await expect(updateMyWhatsApp('u1', '+584141234567')).rejects.toThrow();
  });

  it('saves the agency number', async () => {
    const { eq } = updateChain({ data: [{ whatsapp: '+584240000001' }], error: null });

    await updateAgencyWhatsApp('a1', '+584240000001');

    expect(supabase.from).toHaveBeenCalledWith('agencies');
    expect(eq).toHaveBeenCalledWith('id', 'a1');
  });

  it('reads the agency number, or null', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { whatsapp: '+584240000001' }, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    await expect(fetchAgencyWhatsApp('a1')).resolves.toBe('+584240000001');
    expect(select).toHaveBeenCalledWith('whatsapp');
  });
});

describe('authApi landlord', () => {
  beforeEach(() => jest.clearAllMocks());

  it('searches landlord candidates through the agent-only function, with masked emails', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [{ user_id: 'c1', display_name: 'Ana García', masked_email: 'a***@gmail.com' }],
      error: null,
    });

    await expect(searchLandlordCandidates('  Ana ')).resolves.toEqual([
      { userId: 'c1', displayName: 'Ana García', maskedEmail: 'a***@gmail.com' },
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith('search_landlord_candidates', { p_query: 'Ana' });
  });

  it('does not search with fewer than 3 characters', async () => {
    await expect(searchLandlordCandidates('an')).resolves.toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('reads the landlord of a listing when allowed, or null', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValueOnce({
      data: [{ display_name: 'Ana García', email: 'ana@gmail.com' }],
      error: null,
    });
    await expect(fetchPropertyLandlord('p1')).resolves.toEqual({ displayName: 'Ana García', email: 'ana@gmail.com' });
    expect(supabase.rpc).toHaveBeenCalledWith('get_property_landlord', { p_property_id: 'p1' });

    (supabase.rpc as jest.Mock).mockResolvedValueOnce({ data: [], error: null });
    await expect(fetchPropertyLandlord('p2')).resolves.toBeNull();
  });
});

