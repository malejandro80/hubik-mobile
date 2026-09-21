import { getStartActions } from '../startActions';
import { AuthStatus, RoleCapabilities } from '../../types/auth';

const caps = (overrides: Partial<RoleCapabilities> = {}): RoleCapabilities => ({
  canRegisterProperty: false,
  canCreateAgency: false,
  canViewAgencyListings: false,
  ...overrides,
});

describe('getStartActions', () => {
  it('offers search and sign in to a signed-out visitor', () => {
    expect(getStartActions(caps(), 'signedOut')).toEqual(['search', 'sign_in']);
  });

  it('offers only search to a signed-in client', () => {
    expect(getStartActions(caps({ canCreateAgency: true }), 'signedIn')).toEqual(['search']);
  });

  it('adds publishing for an agent', () => {
    expect(getStartActions(caps({ canRegisterProperty: true }), 'signedIn')).toEqual(['search', 'register']);
  });

  it('adds Mi inmobiliaria for an owner, after publishing', () => {
    expect(
      getStartActions(caps({ canRegisterProperty: true, canViewAgencyListings: true }), 'signedIn')
    ).toEqual(['search', 'register', 'my_agency']);
  });

  it('never shows sign in once signed in, nor publishing to a signed-out visitor', () => {
    expect(getStartActions(caps(), 'signedIn')).not.toContain('sign_in');
    expect(getStartActions(caps(), 'signedOut')).not.toContain('register');
    expect(getStartActions(caps(), 'signedOut')).not.toContain('my_agency');
  });

  it.each<AuthStatus>(['loading'])('shows just search while the session is %s', (status) => {
    expect(getStartActions(caps(), status)).toEqual(['search']);
  });
});
