import { isEligibleLandlord, parseLandlordId } from '../landlord';

describe('parseLandlordId', () => {
  it('accepts a missing landlord', () => {
    expect(parseLandlordId(undefined)).toEqual({ ok: true, landlordId: null });
    expect(parseLandlordId(null)).toEqual({ ok: true, landlordId: null });
  });

  it('accepts a UUID', () => {
    expect(parseLandlordId('11111111-1111-4111-8111-111111111111')).toEqual({
      ok: true,
      landlordId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it.each(['', 'abc', 42, '11111111-1111-4111-8111-11111111111Z', { id: 'x' }])('rejects %p', (value) => {
    expect(parseLandlordId(value)).toEqual({ ok: false });
  });
});

describe('isEligibleLandlord', () => {
  it('only accepts a client with a confirmed email', () => {
    expect(isEligibleLandlord({ role: 'client' }, { email_confirmed_at: '2026-09-23T00:00:00Z' })).toBe(true);
    expect(isEligibleLandlord({ role: 'agent' }, { email_confirmed_at: '2026-09-23T00:00:00Z' })).toBe(false);
    expect(isEligibleLandlord({ role: 'client' }, { email_confirmed_at: null })).toBe(false);
    expect(isEligibleLandlord(null, { email_confirmed_at: '2026-09-23T00:00:00Z' })).toBe(false);
    expect(isEligibleLandlord({ role: 'client' }, null)).toBe(false);
  });
});
