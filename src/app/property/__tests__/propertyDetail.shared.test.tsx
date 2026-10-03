import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PropertyDetailScreen from '../[id]';
import * as authApi from '../../../services/authApi';

jest.mock('../../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({ state: { status: 'idle' }, start: jest.fn(), stop: jest.fn(), cancel: jest.fn() }),
}));

jest.mock('../../../services/chatApi', () => ({
  generatePropertyDescription: jest.fn().mockResolvedValue({ description: 'Texto generado.' }),
}));

jest.mock('../../../services/authApi', () => ({
  fetchAgencyName: jest.fn().mockResolvedValue('Casa Norte'),
  fetchPropertyLandlord: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../hooks/useAuth', () => {
  const { ROLE_CAPABILITIES } = jest.requireActual('../../../lib/roles');
  return {
    useAuth: () => ({
      status: 'signedIn',
      profile: { userId: 'u1', role: 'agent', agencyId: 'a1', displayName: 'Ana' },
      capabilities: ROLE_CAPABILITIES.agent,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    }),
  };
});

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const PHOTOS = JSON.stringify(['https://example.com/a.jpg', 'https://example.com/b.jpg']);

const listing = {
  id: 'prop-1',
  title: 'Piso en Valencia',
  price: '250000',
  currency: 'EUR',
  city: 'Valencia',
  address: 'Calle Colón 5',
  bedrooms: '2',
  bathrooms: '1',
  square_meters: '84',
  property_type: 'Apartment',
  operation_type: 'sale',
  description: 'Piso luminoso junto al centro.',
  images: PHOTOS,
  amenities: JSON.stringify(['terraza', 'ascensor']),
  lat: '39.47',
  lng: '-0.37',
};

const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';

describe('PropertyDetailScreen opened from an opaque share link', () => {
  beforeEach(() => jest.clearAllMocks());

  it('looks up the landlord of a regular listing', async () => {
    mockParams = listing;
    render(<PropertyDetailScreen />);

    await waitFor(() => expect(authApi.fetchPropertyLandlord).toHaveBeenCalledWith('prop-1'));
  });

  it('never uses the share token as a listing id', async () => {
    mockParams = { ...listing, id: TOKEN, shared: '1' };
    const { findByText } = render(<PropertyDetailScreen />);

    await findByText('Piso en Valencia');
    expect(authApi.fetchPropertyLandlord).not.toHaveBeenCalled();
  });
});
