import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { DrawerProfileCard } from '../DrawerProfileCard';
import { AuthContext } from '../../hooks/AuthProvider';
import { getCapabilities } from '../../lib/roles';
import { AuthState, Profile } from '../../types/auth';
import { updateMyWhatsApp } from '../../services/authApi';

jest.mock('../../services/authApi', () => ({
  updateMyWhatsApp: jest.fn().mockResolvedValue(undefined),
}));

const buildAuthState = (overrides: Partial<AuthState>): AuthState => ({
  status: 'signedOut',
  profile: null,
  capabilities: getCapabilities(null),
  signIn: async () => 'cancelled',
  signOut: async () => undefined,
  refreshProfile: async () => undefined,
  ...overrides,
});

const signedIn = (profile: Partial<Profile> = {}): AuthState => {
  const fullProfile: Profile = {
    userId: 'u1',
    role: 'client',
    agencyId: null,
    displayName: 'miguel alejandro',
    avatarUrl: null,
    ...profile,
  };
  return buildAuthState({
    status: 'signedIn',
    profile: fullProfile,
    capabilities: getCapabilities(fullProfile.role),
  });
};

const renderCard = (state: AuthState, onSignInPress = jest.fn()) => ({
  onSignInPress,
  ...render(
    <AuthContext.Provider value={state}>
      <DrawerProfileCard onSignInPress={onSignInPress} />
    </AuthContext.Provider>
  ),
});

describe('DrawerProfileCard', () => {
  it('shows the signed-in name, the role label and the initials without a photo', () => {
    const { getByText, queryByTestId } = renderCard(signedIn());

    expect(getByText('miguel alejandro')).toBeTruthy();
    expect(getByText('Cliente')).toBeTruthy();
    expect(getByText('MA')).toBeTruthy();
    expect(queryByTestId('profile-avatar-image')).toBeNull();
  });

  it('shows the Google photo when there is one', () => {
    const { getByTestId, queryByText } = renderCard(
      signedIn({ avatarUrl: 'https://lh3.googleusercontent.com/a/me' })
    );

    expect(getByTestId('profile-avatar-image').props.source).toEqual({
      uri: 'https://lh3.googleusercontent.com/a/me',
    });
    expect(queryByText('MA')).toBeNull();
  });

  it('falls back to the initials when the photo fails to load', () => {
    const { getByTestId, getByText, queryByTestId } = renderCard(
      signedIn({ avatarUrl: 'https://lh3.googleusercontent.com/a/broken' })
    );

    fireEvent(getByTestId('profile-avatar-image'), 'error');

    expect(queryByTestId('profile-avatar-image')).toBeNull();
    expect(getByText('MA')).toBeTruthy();
  });

  it.each([
    ['agent', 'Agente'],
    ['owner', 'Propietario'],
  ] as const)('labels the %s role as %s', (role, label) => {
    const { getByText } = renderCard(signedIn({ role, agencyId: 'a1' }));
    expect(getByText(label)).toBeTruthy();
  });

  it('uses a neutral name and no photo or initials when the account has no display name', () => {
    const { getByText, getByTestId, queryByTestId } = renderCard(signedIn({ displayName: null }));

    expect(getByText('Usuario')).toBeTruthy();
    expect(getByTestId('profile-card').props.accessibilityLabel).toBe('Usuario, Cliente');
    expect(queryByTestId('profile-avatar-image')).toBeNull();
  });

  it('describes the signed-in card to screen readers and is not a button', () => {
    const { getByTestId } = renderCard(signedIn());
    const card = getByTestId('profile-card');

    expect(card.props.accessibilityLabel).toBe('miguel alejandro, Cliente');
    expect(card.props.accessibilityRole).not.toBe('button');
  });

  it('shows the marketing message and opens sign-in when nobody is signed in', () => {
    const { getByText, getByTestId, onSignInPress } = renderCard(buildAuthState({}));

    expect(getByText('Encuentra la propiedad de tus sueños')).toBeTruthy();
    expect(getByText('Regístrate')).toBeTruthy();

    const card = getByTestId('profile-card');
    expect(card.props.accessibilityRole).toBe('button');
    fireEvent.press(card);
    expect(onSignInPress).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while the session is still loading', () => {
    const { queryByTestId } = renderCard(buildAuthState({ status: 'loading' }));
    expect(queryByTestId('profile-card')).toBeNull();
  });

  it('lets an agent publish their WhatsApp number and refreshes the profile', async () => {
    const refreshProfile = jest.fn().mockResolvedValue(undefined);
    const state = { ...signedIn({ role: 'agent', agencyId: 'a1', userId: 'agent-1' }), refreshProfile };
    const { getByText, getByLabelText } = renderCard(state);

    expect(getByText('WhatsApp de contacto')).toBeTruthy();
    fireEvent.press(getByLabelText('Añadir WhatsApp'));
    fireEvent.changeText(getByLabelText('Número de WhatsApp'), '+58 414 123 4567');
    fireEvent.press(getByLabelText('Guardar'));

    await waitFor(() => expect(updateMyWhatsApp).toHaveBeenCalledWith('agent-1', '+584141234567'));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalled());
  });

  it.each(['client', 'owner'] as const)('does not ask a %s for a WhatsApp number', (role) => {
    const { queryByText } = renderCard(signedIn({ role }));

    expect(queryByText('WhatsApp de contacto')).toBeNull();
  });
});

