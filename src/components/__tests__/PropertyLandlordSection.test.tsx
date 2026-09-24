import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PropertyLandlordSection } from '../PropertyLandlordSection';
import { fetchPropertyLandlord } from '../../services/authApi';
import { AuthContext } from '../../hooks/AuthProvider';
import { getCapabilities } from '../../lib/roles';
import { AuthState, Role } from '../../types/auth';

jest.mock('../../services/authApi', () => ({
  fetchPropertyLandlord: jest.fn(),
}));

const session = (role: Role): AuthState => ({
  status: 'signedIn',
  profile: { userId: 'u1', role, agencyId: 'a1', displayName: 'X' },
  capabilities: getCapabilities(role),
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
});

const renderAs = (auth?: AuthState) =>
  render(
    auth ? (
      <AuthContext.Provider value={auth}>
        <PropertyLandlordSection propertyId="p1" />
      </AuthContext.Provider>
    ) : (
      <PropertyLandlordSection propertyId="p1" />
    )
  );

describe('PropertyLandlordSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['agent', 'owner'] as const)('shows the landlord to an allowed %s', async (role) => {
    (fetchPropertyLandlord as jest.Mock).mockResolvedValue({ displayName: 'Ana García', email: 'ana@gmail.com' });
    const { findByText, getByText } = renderAs(session(role));

    expect(await findByText('Ana García · ana@gmail.com')).toBeTruthy();
    expect(getByText('Propietario')).toBeTruthy();
    expect(fetchPropertyLandlord).toHaveBeenCalledWith('p1');
  });

  it('renders nothing when the server says the viewer may not see it', async () => {
    (fetchPropertyLandlord as jest.Mock).mockResolvedValue(null);
    const { queryByText } = renderAs(session('agent'));

    await waitFor(() => expect(fetchPropertyLandlord).toHaveBeenCalled());
    expect(queryByText('Propietario')).toBeNull();
  });

  it('does not even ask for clients or visitors', () => {
    renderAs(session('client'));
    renderAs();

    expect(fetchPropertyLandlord).not.toHaveBeenCalled();
  });
});
