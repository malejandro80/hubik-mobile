import React from 'react';
import { Alert, Share } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PropertyCard } from '../PropertyCard';
import { AuthContext } from '../../hooks/AuthProvider';
import { getCapabilities } from '../../lib/roles';
import { createListingShareLink } from '../../services/listingShareLinks';
import { AuthState, Role } from '../../types/auth';
import { Property } from '../../types/property';

jest.mock('../../constants/share', () => ({
  SHARE_BASE_URL: 'https://hubik.example.app',
  SHARE_PAGE_PATH: '/p',
  OPAQUE_SHARE_PATH: '/s',
  SHARE_QUERY_PARAM: 'id',
}));

jest.mock('../../services/listingShareLinks', () => ({
  createListingShareLink: jest.fn(),
}));

const createLink = createListingShareLink as jest.Mock;
const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';
const LISTING_ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';

const listing: Property = {
  id: LISTING_ID,
  title: 'Casa en El Bosque',
  property_type: 'Single Family',
  price: 850,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 220,
  city: 'Valencia',
  address: 'Calle 5',
  status: 'Available',
  image_url: '',
  images: [],
  amenities: [],
  agency_id: 'agency-a',
  created_by: 'ana',
};

const session = (userId: string, role: Role, agencyId: string | null = 'agency-a'): AuthState => ({
  status: 'signedIn',
  profile: { userId, role, agencyId, displayName: 'Luis' },
  capabilities: getCapabilities(role),
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
});

const pressShare = (auth: AuthState) => {
  const view = render(
    <AuthContext.Provider value={auth}>
      <PropertyCard property={listing} />
    </AuthContext.Provider>
  );
  fireEvent.press(view.getByLabelText('Compartir Casa en El Bosque'));
  return view;
};

describe('PropertyCard scout sharing', () => {
  beforeEach(() => {
    createLink.mockReset();
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shares an opaque link when an agent shares a colleague's listing", async () => {
    createLink.mockResolvedValue(TOKEN);

    pressShare(session('luis', 'agent'));

    await waitFor(() =>
      expect(Share.share).toHaveBeenCalledWith({
        title: 'Casa en El Bosque',
        message: `https://hubik.example.app/s/${TOKEN}`,
      })
    );
    expect(createLink).toHaveBeenCalledWith(LISTING_ID);
  });

  it('shares the usual link when the agent shares their own listing', async () => {
    pressShare(session('ana', 'agent'));

    await waitFor(() =>
      expect(Share.share).toHaveBeenCalledWith({
        title: 'Casa en El Bosque',
        message: 'https://hubik.example.app/p/casa-en-el-bosque-3f2b1c9e',
      })
    );
    expect(createLink).not.toHaveBeenCalled();
  });

  it('shares nothing and explains why when the opaque link cannot be created', async () => {
    createLink.mockResolvedValue(null);

    pressShare(session('luis', 'owner'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(Share.share).not.toHaveBeenCalled();
  });

  it('shares nothing when creating the opaque link fails', async () => {
    createLink.mockRejectedValue(new Error('down'));

    pressShare(session('luis', 'agent'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(Share.share).not.toHaveBeenCalled();
  });
});
