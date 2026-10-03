import { renderHook, waitFor } from '@testing-library/react-native';
import { useOpaqueSharedListing } from '../useSharedProperty';
import { fetchSharedListingByToken } from '../../services/listingShareLinks';

jest.mock('../../services/listingShareLinks', () => ({
  fetchSharedListingByToken: jest.fn(),
}));

jest.mock('../../services/sharedProperty', () => ({
  fetchSharedPropertyByRef: jest.fn(),
}));

const fetchMock = fetchSharedListingByToken as jest.Mock;
const TOKEN = '9f1c2b3a4d5e6f708192a3b4c5d6e7f8';

describe('useOpaqueSharedListing', () => {
  beforeEach(() => fetchMock.mockReset());

  it('loads the listing behind a share token', async () => {
    fetchMock.mockResolvedValue({ id: TOKEN, title: 'Casa' });
    const { result } = renderHook(() => useOpaqueSharedListing(TOKEN));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.property).toEqual({ id: TOKEN, title: 'Casa' });
    expect(fetchMock).toHaveBeenCalledWith(TOKEN);
  });

  it('reports not_found for an unknown token', async () => {
    fetchMock.mockResolvedValue(null);
    const { result } = renderHook(() => useOpaqueSharedListing(TOKEN));

    await waitFor(() => expect(result.current.status).toBe('not_found'));
  });

  it('reports not_found without calling the server for an invalid token', () => {
    const { result } = renderHook(() => useOpaqueSharedListing('3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55'));

    expect(result.current.status).toBe('not_found');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports error when loading fails', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useOpaqueSharedListing(TOKEN));

    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
