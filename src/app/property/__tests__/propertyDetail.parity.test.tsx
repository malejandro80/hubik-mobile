import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PropertyDetailScreen from '../[id]';
import * as chatApi from '../../../services/chatApi';
import * as authApi from '../../../services/authApi';

jest.mock('../../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({ state: { status: 'idle' }, start: jest.fn(), stop: jest.fn(), cancel: jest.fn() }),
}));

jest.mock('../../../services/chatApi', () => ({
  generatePropertyDescription: jest.fn().mockResolvedValue({ description: 'Texto generado.' }),
}));

jest.mock('../../../services/authApi', () => ({
  fetchAgencyName: jest.fn().mockResolvedValue('Casa Norte'),
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

describe('PropertyDetailScreen parity between preview and published listing', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the preview exactly as a client will see it: approximate location, no street address', () => {
    mockParams = { ...listing, id: 'draft-preview', preview: '1' };
    const { getAllByText, queryByText, getByTestId } = render(<PropertyDetailScreen />);

    expect(queryByText('Calle Colón 5')).toBeNull();
    expect(getAllByText('Ubicación aproximada').length).toBeGreaterThan(0);
    expect(getByTestId('property-map-preview')).toBeTruthy();
  });

  it('shows the signed-in agent and agency card in the preview, like the published listing', async () => {
    mockParams = { ...listing, id: 'draft-preview', preview: '1' };
    const { findByText } = render(<PropertyDetailScreen />);

    expect(await findByText('Casa Norte · Ana')).toBeTruthy();
    expect(authApi.fetchAgencyName).toHaveBeenCalledWith('a1');
  });

  it('shows the same price, description, photos and amenities in preview and published views', async () => {
    for (const params of [
      { ...listing, id: 'draft-preview', preview: '1' },
      { ...listing, agency_name: 'Casa Norte', agent_name: 'Ana' },
    ]) {
      mockParams = params;
      const { getByText, unmount } = render(<PropertyDetailScreen />);
      await waitFor(() => expect(getByText('Casa Norte · Ana')).toBeTruthy());

      expect(getByText('250.000 €')).toBeTruthy();
      expect(getByText('Piso luminoso junto al centro.')).toBeTruthy();
      expect(getByText('1 de 2 fotos')).toBeTruthy();
      expect(getByText('terraza')).toBeTruthy();
      expect(getByText('ascensor')).toBeTruthy();
      unmount();
    }
    expect(chatApi.generatePropertyDescription).not.toHaveBeenCalled();
  });

  it('counts the real photos of a published listing that has no stored description', () => {
    const { description: _description, ...withoutDescription } = listing;
    mockParams = withoutDescription;
    const { getByText, queryByText } = render(<PropertyDetailScreen />);

    expect(getByText('1 de 2 fotos')).toBeTruthy();
    expect(queryByText('1 de 8 fotos')).toBeNull();
  });
});
