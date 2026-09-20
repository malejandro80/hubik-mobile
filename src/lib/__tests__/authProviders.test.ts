import { AUTH_PROVIDER_OPTIONS, describeAuthError } from '../authProviders';

describe('authProviders', () => {
  it('offers Google and Apple with their button labels', () => {
    expect(AUTH_PROVIDER_OPTIONS).toEqual([
      { provider: 'google', label: 'Continuar con Google' },
      { provider: 'apple', label: 'Continuar con Apple' },
    ]);
  });

  it('describes Error instances by their message and other values as text', () => {
    expect(describeAuthError(new Error('boom'))).toBe('boom');
    expect(describeAuthError('plain')).toBe('plain');
  });
});
