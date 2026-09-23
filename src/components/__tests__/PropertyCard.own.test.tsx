import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyCard } from '../PropertyCard';
import { AuthContext } from '../../hooks/AuthProvider';
import { AuthState, Role } from '../../types/auth';
import { getCapabilities } from '../../lib/roles';
import { Property } from '../../types/property';

const listing: Property = {
  id: 'p1',
  title: 'Casa en El Bosque',
  property_type: 'Single Family',
  price: 850,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 220,
  city: 'Valencia',
  address: null,
  status: 'Available',
  image_url: '',
  images: [],
  amenities: [],
  created_by: 'agent-1',
};

const session = (userId: string, role: Role): AuthState => ({
  status: 'signedIn',
  profile: { userId, role, agencyId: 'a1', displayName: 'Luis' },
  capabilities: getCapabilities(role),
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
});

const renderAs = (auth?: AuthState) =>
  render(
    auth ? (
      <AuthContext.Provider value={auth}>
        <PropertyCard property={listing} />
      </AuthContext.Provider>
    ) : (
      <PropertyCard property={listing} />
    )
  );

describe('PropertyCard ownership badge', () => {
  it('marks the listing as "Tuya" for the agent who published it', () => {
    expect(renderAs(session('agent-1', 'agent')).getByText('Tuya')).toBeTruthy();
  });

  it('shows no badge to a colleague, an owner or a visitor', () => {
    expect(renderAs(session('agent-2', 'agent')).queryByText('Tuya')).toBeNull();
    expect(renderAs(session('owner-1', 'owner')).queryByText('Tuya')).toBeNull();
    expect(renderAs().queryByText('Tuya')).toBeNull();
  });
});
