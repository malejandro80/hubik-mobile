import { renderHook, waitFor } from '@testing-library/react-native';
import * as chatApi from '../../services/chatApi';
import { useLegacyDescription } from '../useLegacyDescription';

jest.mock('../../services/chatApi', () => ({
  generatePropertyDescription: jest.fn(),
}));

describe('useLegacyDescription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when isRealDraft is true', () => {
    const { result } = renderHook(() =>
      useLegacyDescription({
        title: 'Piso',
        city: 'Madrid',
        address: 'Calle Mayor',
        isRealDraft: true,
      })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.description).toBeNull();
    expect(chatApi.generatePropertyDescription).not.toHaveBeenCalled();
  });

  it('fetches description and updates state when isRealDraft is false', async () => {
    (chatApi.generatePropertyDescription as jest.Mock).mockResolvedValueOnce({
      description: 'Hermoso piso en Madrid.',
    });

    const { result } = renderHook(() =>
      useLegacyDescription({
        title: 'Piso',
        city: 'Madrid',
        address: 'Calle Mayor',
        isRealDraft: false,
      })
    );

    await waitFor(() => {
      expect(result.current.description).toBe('Hermoso piso en Madrid.');
      expect(result.current.loading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });

  it('sends the listing amenities to the description generator', async () => {
    (chatApi.generatePropertyDescription as jest.Mock).mockResolvedValueOnce({
      description: 'Piso con piscina.',
    });

    renderHook(() =>
      useLegacyDescription({
        title: 'Piso',
        city: 'Madrid',
        address: 'Calle Mayor',
        amenities: ['piscina', 'ascensor'],
        isRealDraft: false,
      })
    );

    await waitFor(() =>
      expect(chatApi.generatePropertyDescription).toHaveBeenCalledWith(
        expect.objectContaining({ amenities: ['piscina', 'ascensor'] })
      )
    );
  });

  it('omits amenities and a masked address from the generator input', async () => {
    (chatApi.generatePropertyDescription as jest.Mock).mockResolvedValueOnce({
      description: 'Piso en Madrid.',
    });

    renderHook(() =>
      useLegacyDescription({
        title: 'Piso',
        city: 'Madrid',
        amenities: [],
        isRealDraft: false,
      })
    );

    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());
    const sent = (chatApi.generatePropertyDescription as jest.Mock).mock.calls[0][0];
    expect(sent.amenities).toBeUndefined();
    expect(sent.address).toBeUndefined();
  });

  it('sets hasError to true when api call rejects', async () => {
    (chatApi.generatePropertyDescription as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() =>
      useLegacyDescription({
        title: 'Piso',
        city: 'Madrid',
        address: 'Calle Mayor',
        isRealDraft: false,
      })
    );

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.description).toBeNull();
    });
  });
});
