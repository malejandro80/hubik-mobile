import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../useAuth';
import { supabase } from '../../lib/supabase';
import * as authApi from '../../services/authApi';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('../../services/authApi', () => ({
  fetchProfile: jest.fn(),
  signInWithProvider: jest.fn(),
  signOut: jest.fn(),
}));

const auth = supabase.auth as unknown as {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
};
const api = authApi as jest.Mocked<typeof authApi>;

let emitAuthChange: (event: string, session: unknown) => void = () => undefined;
const unsubscribe = jest.fn();

function Probe() {
  const { status, profile, capabilities, signIn, signOut, refreshProfile } = useAuth();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="role">{profile?.role ?? 'none'}</Text>
      <Text testID="name">{profile?.displayName ?? 'none'}</Text>
      <Text testID="avatar">{profile?.avatarUrl ?? 'none'}</Text>
      <Text testID="canRegister">{String(capabilities.canRegisterProperty)}</Text>
      <Text testID="signIn" onPress={() => signIn('google')}>
        sign-in
      </Text>
      <Text testID="signOut" onPress={() => signOut()}>
        sign-out
      </Text>
      <Text testID="refresh" onPress={() => refreshProfile()}>
        refresh
      </Text>
    </>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.onAuthStateChange.mockImplementation((callback: typeof emitAuthChange) => {
      emitAuthChange = callback;
      return { data: { subscription: { unsubscribe } } };
    });
  });

  it('starts as loading, then signed out when there is no stored session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });

    const { getByTestId } = renderProvider();
    expect(getByTestId('status').props.children).toBe('loading');

    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedOut'));
    expect(getByTestId('role').props.children).toBe('none');
    expect(getByTestId('canRegister').props.children).toBe('false');
  });

  it('restores a stored session and exposes the agent capabilities', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    api.fetchProfile.mockResolvedValue({
      userId: 'u1',
      role: 'agent',
      agencyId: 'a1',
      displayName: 'Ana',
    });

    const { getByTestId } = renderProvider();

    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedIn'));
    expect(api.fetchProfile).toHaveBeenCalledWith('u1');
    expect(getByTestId('role').props.children).toBe('agent');
    expect(getByTestId('canRegister').props.children).toBe('true');
  });

  it('falls back to a client profile when the profile cannot be read', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    api.fetchProfile.mockRejectedValue(new Error('offline'));

    const { getByTestId } = renderProvider();

    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedIn'));
    expect(getByTestId('role').props.children).toBe('client');
    expect(getByTestId('canRegister').props.children).toBe('false');
  });

  it('exposes the profile name and the https Google photo from the session', async () => {
    auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'u1', user_metadata: { avatar_url: 'https://lh3.googleusercontent.com/a/me' } },
        },
      },
    });
    api.fetchProfile.mockResolvedValue({
      userId: 'u1',
      role: 'client',
      agencyId: null,
      displayName: 'Ana Pérez',
    });

    const { getByTestId } = renderProvider();

    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedIn'));
    expect(getByTestId('name').props.children).toBe('Ana Pérez');
    expect(getByTestId('avatar').props.children).toBe('https://lh3.googleusercontent.com/a/me');
  });

  it('ignores an unsafe photo URL and keeps the client fallback avatar empty', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', user_metadata: { avatar_url: 'http://insecure.test/a.png' } } } },
    });
    api.fetchProfile.mockRejectedValue(new Error('offline'));

    const { getByTestId } = renderProvider();

    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedIn'));
    expect(getByTestId('avatar').props.children).toBe('none');
  });

  it('reacts to sign-in and sign-out events from Supabase', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    api.fetchProfile.mockResolvedValue({
      userId: 'u2',
      role: 'owner',
      agencyId: 'a2',
      displayName: null,
    });

    const { getByTestId } = renderProvider();
    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedOut'));

    act(() => emitAuthChange('SIGNED_IN', { user: { id: 'u2' } }));
    await waitFor(() => expect(getByTestId('role').props.children).toBe('owner'));

    act(() => emitAuthChange('SIGNED_OUT', null));
    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedOut'));
    expect(getByTestId('role').props.children).toBe('none');
  });

  it('delegates signIn and signOut to the auth service', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    api.signInWithProvider.mockResolvedValue('cancelled');
    api.signOut.mockResolvedValue(undefined);

    const { getByTestId } = renderProvider();
    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedOut'));

    fireEvent.press(getByTestId('signIn'));
    fireEvent.press(getByTestId('signOut'));

    await waitFor(() => {
      expect(api.signInWithProvider).toHaveBeenCalledWith('google');
      expect(api.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it('refetches the profile on refreshProfile so a new role applies', async () => {
    auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    api.fetchProfile
      .mockResolvedValueOnce({ userId: 'u1', role: 'client', agencyId: null, displayName: null })
      .mockResolvedValueOnce({ userId: 'u1', role: 'owner', agencyId: 'a9', displayName: null });

    const { getByTestId } = renderProvider();
    await waitFor(() => expect(getByTestId('role').props.children).toBe('client'));

    fireEvent.press(getByTestId('refresh'));
    await waitFor(() => expect(getByTestId('role').props.children).toBe('owner'));
  });

  it('unsubscribes from auth changes on unmount', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null } });
    const { unmount, getByTestId } = renderProvider();
    await waitFor(() => expect(getByTestId('status').props.children).toBe('signedOut'));

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('useAuth without a provider', () => {
  it('reports signed out with no capabilities instead of throwing', () => {
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('status').props.children).toBe('signedOut');
    expect(getByTestId('canRegister').props.children).toBe('false');
  });
});
