import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSharedProperty } from '../useSharedProperty';
import { fetchSharedPropertyByRef } from '../../services/sharedProperty';

jest.mock('../../services/sharedProperty', () => ({
  fetchSharedPropertyByRef: jest.fn(),
}));

const fetchMock = fetchSharedPropertyByRef as jest.Mock;

const ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';
const OTHER_ID = '11111111-2222-4333-8444-555555555555';
const PROPERTY = { id: ID, title: 'Piso en Madrid' };

describe('useSharedProperty', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('starts loading, then exposes the property', async () => {
    fetchMock.mockResolvedValue(PROPERTY);
    const { result } = renderHook(() => useSharedProperty(ID));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.property).toEqual(PROPERTY);
    expect(fetchMock).toHaveBeenCalledWith({ kind: 'id', id: ID });
  });

  it('resolves a readable slug through its short id', async () => {
    fetchMock.mockResolvedValue(PROPERTY);
    const { result } = renderHook(() => useSharedProperty('piso-en-madrid-3f2b1c9e'));

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(fetchMock).toHaveBeenCalledWith({ kind: 'slug', slug: 'piso-en-madrid-3f2b1c9e', shortId: '3f2b1c9e' });
  });

  it('reports not_found when the listing does not exist', async () => {
    fetchMock.mockResolvedValue(null);
    const { result } = renderHook(() => useSharedProperty(ID));

    await waitFor(() => expect(result.current.status).toBe('not_found'));

    expect(result.current.property).toBeNull();
  });

  it.each([undefined, '', 'draft-preview', "x' or 1=1"])('reports not_found for %p without asking the server', (id) => {
    const { result } = renderHook(() => useSharedProperty(id));

    expect(result.current).toEqual(expect.objectContaining({ status: 'not_found', property: null }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an error and lets the visitor retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(PROPERTY);
    const { result } = renderHook(() => useSharedProperty(ID));

    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.property).toEqual(PROPERTY);
  });

  it('loads the new listing when the id changes and ignores the old answer', async () => {
    let resolveFirst!: (value: unknown) => void;
    fetchMock
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({ id: OTHER_ID, title: 'Casa' });
    const { result, rerender } = renderHook(({ id }) => useSharedProperty(id), { initialProps: { id: ID } });

    rerender({ id: OTHER_ID });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => resolveFirst(PROPERTY));

    expect(result.current.property).toEqual({ id: OTHER_ID, title: 'Casa' });
  });
});
