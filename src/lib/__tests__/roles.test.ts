import { getCapabilities, ROLE_CAPABILITIES, SIGNED_OUT_CAPABILITIES } from '../roles';

describe('roles', () => {
  it('denies every capability when signed out', () => {
    expect(getCapabilities(null)).toEqual({
      canRegisterProperty: false,
      canCreateAgency: false,
      canViewAgencyListings: false,
    });
    expect(getCapabilities(null)).toBe(SIGNED_OUT_CAPABILITIES);
  });

  it('lets a client create an agency but not register properties', () => {
    expect(getCapabilities('client')).toEqual({
      canRegisterProperty: false,
      canCreateAgency: true,
      canViewAgencyListings: false,
    });
  });

  it('lets an agent register properties only', () => {
    expect(getCapabilities('agent')).toEqual({
      canRegisterProperty: true,
      canCreateAgency: false,
      canViewAgencyListings: false,
    });
  });

  it('lets an owner view agency listings but not register properties', () => {
    expect(getCapabilities('owner')).toEqual({
      canRegisterProperty: false,
      canCreateAgency: false,
      canViewAgencyListings: true,
    });
  });

  it('defines capabilities for exactly the three roles', () => {
    expect(Object.keys(ROLE_CAPABILITIES).sort()).toEqual(['agent', 'client', 'owner']);
  });
});
