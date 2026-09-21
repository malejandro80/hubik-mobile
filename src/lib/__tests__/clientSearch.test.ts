import { isRateLimitedError, normalizeClientQuery, shouldSearchClients, toClientCandidates } from '../clientSearch';

describe('clientSearch helpers', () => {
  it('trims and caps the query', () => {
    expect(normalizeClientQuery('  ana  ')).toBe('ana');
    expect(normalizeClientQuery('a'.repeat(150))).toHaveLength(100);
  });

  it('only searches from three characters, ignoring surrounding spaces', () => {
    expect(shouldSearchClients('an')).toBe(false);
    expect(shouldSearchClients('  an  ')).toBe(false);
    expect(shouldSearchClients('ana')).toBe(true);
    expect(shouldSearchClients('  ana ')).toBe(true);
    expect(shouldSearchClients('')).toBe(false);
  });

  it('recognises the server rate-limit error by its message', () => {
    expect(isRateLimitedError({ message: 'rate_limited', code: 'P0001' })).toBe(true);
    expect(isRateLimitedError(new Error('rate_limited'))).toBe(true);
    expect(isRateLimitedError(new Error('boom'))).toBe(false);
    expect(isRateLimitedError(null)).toBe(false);
  });

  it('maps only well-formed rows to candidates', () => {
    expect(toClientCandidates('nope')).toEqual([]);
    expect(
      toClientCandidates([
        { user_id: 'u1', display_name: null, masked_email: 'a***@x.com' },
        { user_id: 5, display_name: 'x', masked_email: 'a***@x.com' },
        { user_id: 'u3', display_name: 'x' },
      ])
    ).toEqual([{ userId: 'u1', displayName: null, maskedEmail: 'a***@x.com' }]);
  });
});
