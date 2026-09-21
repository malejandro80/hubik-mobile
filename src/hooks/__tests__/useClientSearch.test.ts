import { act, renderHook } from '@testing-library/react-native';
import { useClientSearch } from '../useClientSearch';
import { RateLimitedError } from '../../lib/clientSearch';
import { searchAgentCandidates } from '../../services/authApi';

jest.mock('../../services/authApi', () => ({
  searchAgentCandidates: jest.fn(),
}));

const search = searchAgentCandidates as jest.Mock;

const ANA = { userId: 'u1', displayName: 'Ana García', maskedEmail: 'a***@gmail.com' };
const ANABEL = { userId: 'u2', displayName: 'Anabel Ruiz', maskedEmail: 'a***@correo.com' };

const flush = async (ms = 300) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

describe('useClientSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    search.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays idle and never calls the server below three characters', async () => {
    const { result } = renderHook(({ query }) => useClientSearch(query), { initialProps: { query: 'an' } });

    await flush(1000);

    expect(result.current).toEqual({ status: 'idle', results: [] });
    expect(search).not.toHaveBeenCalled();
  });

  it('shows loading, then the results once the pause has passed', async () => {
    search.mockResolvedValue([ANA]);
    const { result } = renderHook(({ query }) => useClientSearch(query), { initialProps: { query: 'ana' } });

    expect(result.current.status).toBe('loading');
    expect(search).not.toHaveBeenCalled();

    await flush();

    expect(search).toHaveBeenCalledWith('ana');
    expect(result.current).toEqual({ status: 'ready', results: [ANA] });
  });

  it('waits for the typing to pause and searches only the latest text', async () => {
    search.mockResolvedValue([ANABEL]);
    const { result, rerender } = renderHook(({ query }) => useClientSearch(query), { initialProps: { query: 'ana' } });

    await flush(100);
    rerender({ query: 'anab' });
    await flush(100);
    rerender({ query: 'anabe' });
    await flush();

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('anabe');
    expect(result.current.results).toEqual([ANABEL]);
  });

  it('ignores a slow answer for text the user already changed', async () => {
    let resolveFirst!: (value: unknown) => void;
    search.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve))).mockResolvedValueOnce([ANABEL]);
    const { result, rerender } = renderHook(({ query }) => useClientSearch(query), { initialProps: { query: 'ana' } });
    await flush();

    rerender({ query: 'anab' });
    await flush();
    await act(async () => resolveFirst([ANA]));

    expect(result.current).toEqual({ status: 'ready', results: [ANABEL] });
  });

  it('reports the rate limit', async () => {
    search.mockRejectedValue(new RateLimitedError());
    const { result } = renderHook(({ query }) => useClientSearch(query), { initialProps: { query: 'ana' } });

    await flush();

    expect(result.current).toEqual({ status: 'rate_limited', results: [] });
  });

  it('reports any other failure as an error', async () => {
    search.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(({ query }) => useClientSearch(query), { initialProps: { query: 'ana' } });

    await flush();

    expect(result.current).toEqual({ status: 'error', results: [] });
  });

  it('goes idle when the text gets short again, and searches afresh when it comes back', async () => {
    search.mockResolvedValueOnce([ANA]).mockResolvedValueOnce([]);
    const { result, rerender } = renderHook(({ query }) => useClientSearch(query), { initialProps: { query: 'ana' } });
    await flush();
    expect(result.current.results).toEqual([ANA]);

    rerender({ query: 'an' });
    expect(result.current).toEqual({ status: 'idle', results: [] });

    rerender({ query: 'ana' });
    await flush();

    expect(search).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({ status: 'ready', results: [] });
  });
});
