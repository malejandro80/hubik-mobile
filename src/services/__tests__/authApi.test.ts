import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import {
  createAgency,
  fetchAgencyListings,
  fetchProfile,
  signInWithProvider,
  signOut,
} from '../authApi';

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
      data: { user_id: 'u1', role: 'agent', agency_id: 'a1', display_name: 'Ana' },
      error: null,
    });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const profile = await fetchProfile('u1');

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(profile).toEqual({
      userId: 'u1',
      role: 'agent',
      agencyId: 'a1',
      displayName: 'Ana',
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

describe('authApi.fetchAgencyListings', () => {
  it('reads the agency listings newest first from the listings view', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const listings = await fetchAgencyListings('a1');

    expect(supabase.from).toHaveBeenCalledWith('property_listings');
    expect(eq).toHaveBeenCalledWith('agency_id', 'a1');
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
