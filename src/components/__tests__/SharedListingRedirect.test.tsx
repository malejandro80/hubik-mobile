import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { SharedListingRedirect } from '../SharedListingRedirect';
import { fetchSharedPropertyByRef } from '../../services/sharedProperty';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('../../services/sharedProperty', () => ({
  fetchSharedPropertyByRef: jest.fn(),
}));

const fetchMock = fetchSharedPropertyByRef as jest.Mock;

const PROPERTY = {
  id: '6ff52f65-00be-4ee2-a304-302a60358d4e',
  title: 'Piso en venta en Madrid',
  property_type: 'Apartment',
  price: 420000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Madrid',
  address: 'Calle Mayor 12',
  description: 'Un piso reformado.',
  status: 'Available',
  image_url: 'https://cdn.example.com/cover.jpg',
  images: ['https://cdn.example.com/cover.jpg'],
  amenities: [],
  agency_name: 'Casa Norte',
  agent_name: 'Ana Pérez',
};

describe('SharedListingRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state and navigates nowhere while the listing loads', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { getByTestId } = render(<SharedListingRedirect value="piso-en-venta-en-madrid-6ff52f65" />);

    expect(getByTestId('shared-listing-loading')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('replaces the screen with the normal property screen for that listing', async () => {
    fetchMock.mockResolvedValue(PROPERTY);
    render(<SharedListingRedirect value="piso-en-venta-en-madrid-6ff52f65" />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledWith({
      kind: 'slug',
      slug: 'piso-en-venta-en-madrid-6ff52f65',
      shortId: '6ff52f65',
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/property/[id]',
      params: expect.objectContaining({
        id: PROPERTY.id,
        title: 'Piso en venta en Madrid',
        price: '420000',
        city: 'Madrid',
        description: 'Un piso reformado.',
        images: JSON.stringify(PROPERTY.images),
        agency_name: 'Casa Norte',
        agent_name: 'Ana Pérez',
      }),
    });
  });

  it('also opens a listing given by its full id', async () => {
    fetchMock.mockResolvedValue(PROPERTY);
    render(<SharedListingRedirect value={PROPERTY.id} />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledWith({ kind: 'id', id: PROPERTY.id });
  });

  it('goes back to the start screen when the listing does not exist', async () => {
    fetchMock.mockResolvedValue(null);
    render(<SharedListingRedirect value="casa-6ff52f65" />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'not-a-listing', "x' or 1=1"])('goes to the start screen for %p without asking the server', async (value) => {
    render(<SharedListingRedirect value={value} />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('goes back to the start screen when the network fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    render(<SharedListingRedirect value="casa-6ff52f65" />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});
