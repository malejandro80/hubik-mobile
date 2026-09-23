import { getStartActions, getStartAudience } from '../startActions';
import { AuthStatus, Role, RoleCapabilities } from '../../types/auth';
import { getCapabilities } from '../roles';

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

  it.each<[Role, string[]]>([
    ['client', ['search', 'create_agency']],
    ['agent', ['register', 'search']],
    ['owner', ['my_agency', 'search']],
  ])('puts the main task of a signed-in %s first', (role, expected) => {
    expect(getStartActions(getCapabilities(role), 'signedIn')).toEqual(expected);
  });

  it('keeps the agency before publishing when a role can do both', () => {
    expect(
      getStartActions(caps({ canRegisterProperty: true, canViewAgencyListings: true }), 'signedIn')
    ).toEqual(['my_agency', 'register', 'search']);
  });

  it('never shows sign in once signed in, nor role actions to a signed-out visitor', () => {
    expect(getStartActions(caps(), 'signedIn')).not.toContain('sign_in');
    expect(getStartActions(caps(), 'signedOut')).toEqual(['search', 'sign_in']);
  });

  it.each<AuthStatus>(['loading'])('shows just search while the session is %s', (status) => {
    expect(getStartActions(caps(), status)).toEqual(['search']);
  });
});

describe('getStartAudience', () => {
  it.each<[AuthStatus, Role | null, string]>([
    ['signedOut', null, 'visitor'],
    ['loading', null, 'visitor'],
    ['signedIn', null, 'visitor'],
    ['signedIn', 'client', 'client'],
    ['signedIn', 'agent', 'agent'],
    ['signedIn', 'owner', 'owner'],
  ])('maps %s with role %s to the %s audience', (status, role, audience) => {
    expect(getStartAudience(status, role)).toBe(audience);
  });
});
