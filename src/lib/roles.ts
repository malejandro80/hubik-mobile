import { Role, RoleCapabilities } from '../types/auth';

export const SIGNED_OUT_CAPABILITIES: RoleCapabilities = {
  canRegisterProperty: false,
  canCreateAgency: false,
  canViewAgencyListings: false,
};

export const ROLE_CAPABILITIES: Record<Role, RoleCapabilities> = {
  client: {
    canRegisterProperty: false,
    canCreateAgency: true,
    canViewAgencyListings: false,
  },
  agent: {
    canRegisterProperty: true,
    canCreateAgency: false,
    canViewAgencyListings: false,
  },
  owner: {
    canRegisterProperty: false,
    canCreateAgency: false,
    canViewAgencyListings: true,
  },
};

export function getCapabilities(role: Role | null): RoleCapabilities {
  return role ? ROLE_CAPABILITIES[role] : SIGNED_OUT_CAPABILITIES;
}
