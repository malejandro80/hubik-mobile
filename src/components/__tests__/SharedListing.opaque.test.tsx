import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SharedListingRedirect } from '../SharedListingRedirect';
import { SharedPropertyView } from '../SharedPropertyView';
import { fetchSharedListingByToken } from '../../services/listingShareLinks';
import { Property } from '../../types/property';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../services/listingShareLinks', () => ({
  fetchSharedListingByToken: jest.fn(),
}));

jest.mock('../../services/sharedProperty', () => ({
  fetchSharedPropertyByRef: jest.fn(),
}));

const fetchMock = fetchSharedListingByToken as jest.Mock;
const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';

const SHARED: Property = {
  id: TOKEN,
  title: 'Casa en El Bosque',
  property_type: 'Single Family',
  price: 850,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 220,
  city: 'Valencia',
  address: null,
  status: 'Available',
  image_url: 'https://cdn.example.com/a.jpg',
  images: ['https://cdn.example.com/a.jpg'],
  amenities: [],
  agency_name: 'Casa Norte',
  contact_whatsapp: '+584141234567',
};

describe('SharedListingRedirect with a share token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the detail with the agency contact and without the listing agent', async () => {
    fetchMock.mockResolvedValue(SHARED);

    render(<SharedListingRedirect value={TOKEN} opaque />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const [{ pathname, params }] = mockReplace.mock.calls[0];
    expect(pathname).toBe('/property/[id]');
    expect(params).toMatchObject({ id: TOKEN, shared: '1', agency_name: 'Casa Norte', whatsapp: '+584141234567' });
    expect(params).not.toHaveProperty('agent_name');
    expect(fetchMock).toHaveBeenCalledWith(TOKEN);
  });

  it('goes home for an unknown token', async () => {
    fetchMock.mockResolvedValue(null);

    render(<SharedListingRedirect value={TOKEN} opaque />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});

describe('SharedPropertyView contact', () => {
  it('offers the agency WhatsApp when the shared listing carries one', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByLabelText, getByText } = render(<SharedPropertyView property={SHARED} />);

    expect(getByText('Casa Norte')).toBeTruthy();
    fireEvent.press(getByLabelText('Contactar por WhatsApp'));

    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/584141234567'));
    openURL.mockRestore();
  });

  it('shows no contact button without a WhatsApp number', () => {
    const { queryByLabelText } = render(<SharedPropertyView property={{ ...SHARED, contact_whatsapp: null }} />);

    expect(queryByLabelText('Contactar por WhatsApp')).toBeNull();
  });
});
