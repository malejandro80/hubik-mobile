import { DEFAULT_CURRENCY, normalizeCurrency } from '../currencies';

describe('normalizeCurrency', () => {
  it('keeps a supported currency, case-insensitively', () => {
    expect(normalizeCurrency('eur')).toBe('EUR');
    expect(normalizeCurrency(' VES ')).toBe('VES');
  });

  it('falls back to the default for anything unsupported or missing', () => {
    expect(normalizeCurrency('GBP')).toBe(DEFAULT_CURRENCY);
    expect(normalizeCurrency(undefined)).toBe(DEFAULT_CURRENCY);
    expect(normalizeCurrency(42)).toBe(DEFAULT_CURRENCY);
  });
});
