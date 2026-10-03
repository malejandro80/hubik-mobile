import { needsOpaqueShareLink } from '../sharePolicy';
import { Profile, Role } from '../../types/auth';

const member = (role: Role, userId = 'luis', agencyId: string | null = 'agency-a'): Profile => ({
  userId,
  role,
  agencyId,
  displayName: 'Luis',
});

const colleagueListing = { agency_id: 'agency-a', created_by: 'ana' };

describe('needsOpaqueShareLink', () => {
  it('protects a colleague listing shared by an agent or owner of the same agency', () => {
    expect(needsOpaqueShareLink(member('agent'), colleagueListing)).toBe(true);
    expect(needsOpaqueShareLink(member('owner'), colleagueListing)).toBe(true);
  });

  it('keeps the usual link for the listing the member published', () => {
    expect(needsOpaqueShareLink(member('agent', 'ana'), colleagueListing)).toBe(false);
  });

  it('keeps the usual link for clients, visitors and members of another agency', () => {
    expect(needsOpaqueShareLink(null, colleagueListing)).toBe(false);
    expect(needsOpaqueShareLink(member('client', 'c1', null), colleagueListing)).toBe(false);
    expect(needsOpaqueShareLink(member('agent', 'luis', 'agency-b'), colleagueListing)).toBe(false);
  });

  it('keeps the usual link when the listing ownership is unknown', () => {
    expect(needsOpaqueShareLink(member('agent'), { agency_id: 'agency-a' })).toBe(false);
    expect(needsOpaqueShareLink(member('agent'), { created_by: 'ana' })).toBe(false);
  });
});
