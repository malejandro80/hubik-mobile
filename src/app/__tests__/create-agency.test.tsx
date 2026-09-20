import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CreateAgencyScreen from '../create-agency';
import * as authApi from '../../services/authApi';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRefreshProfile = jest.fn();
let mockAuth: Record<string, unknown>;

jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    useRouter: () => ({ replace: mockReplace, push: mockPush, back: jest.fn() }),
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
  };
});

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../services/authApi', () => ({
  createAgency: jest.fn(),
}));

const clientAuth = {
  status: 'signedIn',
  profile: { userId: 'u1', role: 'client', agencyId: null, displayName: null },
  capabilities: { canRegisterProperty: false, canCreateAgency: true, canViewAgencyListings: false },
  refreshProfile: mockRefreshProfile,
};

describe('CreateAgencyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = clientAuth;
  });

  it('asks a signed-out visitor to sign in first', () => {
    mockAuth = {
      status: 'signedOut',
      profile: null,
      capabilities: { canRegisterProperty: false, canCreateAgency: false, canViewAgencyListings: false },
      refreshProfile: mockRefreshProfile,
    };
    const { getByText, getByLabelText } = render(<CreateAgencyScreen />);

    expect(getByText('Inicie sesión para crear su inmobiliaria.')).toBeTruthy();
    fireEvent.press(getByLabelText('Iniciar sesión'));
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('redirects agents and owners home because they already belong to an agency', () => {
    mockAuth = {
      ...clientAuth,
      profile: { userId: 'u1', role: 'owner', agencyId: 'a1', displayName: null },
      capabilities: { canRegisterProperty: false, canCreateAgency: false, canViewAgencyListings: true },
    };
    const { getByText } = render(<CreateAgencyScreen />);

    expect(getByText('redirect:/')).toBeTruthy();
  });

  it('creates the agency, refreshes the role and opens the agency screen', async () => {
    (authApi.createAgency as jest.Mock).mockResolvedValue('agency-1');
    mockRefreshProfile.mockResolvedValue(undefined);
    const { getByLabelText } = render(<CreateAgencyScreen />);

    fireEvent.changeText(getByLabelText('Nombre de la inmobiliaria'), '  Casa Norte ');
    fireEvent.press(getByLabelText('Crear inmobiliaria'));

    await waitFor(() => expect(authApi.createAgency).toHaveBeenCalledWith('  Casa Norte '));
    await waitFor(() => expect(mockRefreshProfile).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/agency'));
  });

  it('shows the error and stays on the form when creation fails', async () => {
    (authApi.createAgency as jest.Mock).mockRejectedValue(new Error('boom'));
    const { getByLabelText, findByText } = render(<CreateAgencyScreen />);

    fireEvent.changeText(getByLabelText('Nombre de la inmobiliaria'), 'Casa Norte');
    fireEvent.press(getByLabelText('Crear inmobiliaria'));

    expect(await findByText(/No pudimos crear la inmobiliaria \(boom\)/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockRefreshProfile).not.toHaveBeenCalled();
  });

  it('exposes the form title as text', () => {
    const { getByText } = render(<CreateAgencyScreen />);
    expect(getByText('Cree su inmobiliaria')).toBeTruthy();
  });
});
