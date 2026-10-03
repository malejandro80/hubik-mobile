import { Profile } from '../types/auth';
import { Property } from '../types/property';

const AGENCY_ROLES: ReadonlySet<Profile['role']> = new Set(['agent', 'owner']);

export function needsOpaqueShareLink(
  profile: Profile | null,
  listing: Pick<Property, 'agency_id' | 'created_by'>
): boolean {
  if (!profile || !AGENCY_ROLES.has(profile.role) || !profile.agencyId) return false;
  if (!listing.agency_id || !listing.created_by) return false;
  return listing.agency_id === profile.agencyId && listing.created_by !== profile.userId;
}
