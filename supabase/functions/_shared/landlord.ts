import { LANDLORD_ROLE, UUID_PATTERN } from './landlordConstants.ts';

export type LandlordIdResult = { ok: true; landlordId: string | null } | { ok: false };

export function parseLandlordId(value: unknown): LandlordIdResult {
  if (value === undefined || value === null) return { ok: true, landlordId: null };
  if (typeof value === 'string' && UUID_PATTERN.test(value)) return { ok: true, landlordId: value };
  return { ok: false };
}

export function isEligibleLandlord(
  profile: { role: string } | null,
  user: { email_confirmed_at?: string | null } | null
): boolean {
  return profile?.role === LANDLORD_ROLE && Boolean(user?.email_confirmed_at);
}
