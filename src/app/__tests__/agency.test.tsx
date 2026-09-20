import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AgencyScreen from '../agency';
import * as authApi from '../../services/authApi';
import { Property } from '../../types/property';

const mockPush = jest.fn();
let mockAuth: Record<string, unknown>;

jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    useRouter: () => ({ replace: jest.fn(), push: mockPush, back: jest.fn() }),
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
  };
});

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../services/authApi', () => ({
  fetchAgencyListings: jest.fn(),
}));

const ownerAuth = {
  status: 'signedIn',
  profile: { userId: 'u1', role: 'owner', agencyId: 'a1', displayName: 'Olga' },
  capabilities: { canRegisterProperty: false, canCreateAgency: false, canViewAgencyListings: true },
};

const listing: Property = {
  id: 'p1',
  title: 'Piso en venta en Madrid',
  property_type: 'Apartment',
  price: 420000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Madrid',
  address: 'Calle Mayor 12',
  status: 'Available',
  image_url: '',
  images: [],
  amenities: [],
  agency_id: 'a1',
  agency_name: 'Casa Norte',
  agent_name: 'Ana',
};

describe('AgencyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = ownerAuth;
  });

  it('lists the properties published by the owner agency', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([listing]);
    const { findByText } = render(<AgencyScreen />);

    expect(await findByText('Piso en venta en Madrid')).toBeTruthy();
    expect(authApi.fetchAgencyListings).toHaveBeenCalledWith('a1');
  });

  it('shows an empty message when the agency has no listings', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([]);
    const { findByText } = render(<AgencyScreen />);

    expect(await findByText('Sus agentes aún no han publicado propiedades.')).toBeTruthy();
  });

  it('shows an error with a retry that reloads the listings', async () => {
    (authApi.fetchAgencyListings as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([listing]);
    const { findByText, getByLabelText } = render(<AgencyScreen />);

    expect(await findByText('No pudimos cargar las propiedades de su inmobiliaria.')).toBeTruthy();
    fireEvent.press(getByLabelText('Reintentar'));

    expect(await findByText('Piso en venta en Madrid')).toBeTruthy();
    expect(authApi.fetchAgencyListings).toHaveBeenCalledTimes(2);
  });

  it('redirects anyone who is not an owner', () => {
    mockAuth = {
      status: 'signedIn',
      profile: { userId: 'u1', role: 'client', agencyId: null, displayName: null },
      capabilities: { canRegisterProperty: false, canCreateAgency: true, canViewAgencyListings: false },
    };
    const { getByText } = render(<AgencyScreen />);

    expect(getByText('redirect:/')).toBeTruthy();
  });

  it('opens the property detail when a listing is pressed', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([listing]);
    const { findByLabelText } = render(<AgencyScreen />);

    fireEvent.press(await findByLabelText('Ver detalle de Piso en venta en Madrid'));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/property/[id]' })
      )
    );
  });
});
