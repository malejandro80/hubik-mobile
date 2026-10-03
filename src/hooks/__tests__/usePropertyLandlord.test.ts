import { renderHook, waitFor } from '@testing-library/react-native';
import { usePropertyLandlord } from '../usePropertyLandlord';
import { fetchPropertyLandlord } from '../../services/authApi';
import { useAuth } from '../useAuth';

jest.mock('../../services/authApi', () => ({
  fetchPropertyLandlord: jest.fn(),
}));

jest.mock('../useAuth', () => ({
  useAuth: jest.fn(),
}));

describe('usePropertyLandlord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch when role is client or visitor', () => {
    (useAuth as jest.Mock).mockReturnValue({
      profile: { role: 'client' },
    });

    const { result } = renderHook(() => usePropertyLandlord('prop-1'));

    expect(result.current.mayView).toBe(false);
    expect(result.current.landlord).toBeNull();
    expect(fetchPropertyLandlord).not.toHaveBeenCalled();
  });

  it('fetches and returns landlord data for agent', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      profile: { role: 'agent' },
    });

    (fetchPropertyLandlord as jest.Mock).mockResolvedValueOnce({
      displayName: 'Carlos Ruiz',
      email: 'carlos@example.com',
    });

    const { result } = renderHook(() => usePropertyLandlord('prop-1'));

    expect(result.current.mayView).toBe(true);

    await waitFor(() => {
      expect(result.current.landlord).toEqual({
        displayName: 'Carlos Ruiz',
        email: 'carlos@example.com',
      });
    });

    expect(fetchPropertyLandlord).toHaveBeenCalledWith('prop-1');
  });

  it('handles error gracefully and sets landlord to null', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      profile: { role: 'owner' },
    });

    (fetchPropertyLandlord as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePropertyLandlord('prop-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.landlord).toBeNull();
  });
});
