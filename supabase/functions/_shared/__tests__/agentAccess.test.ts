import { decideAgentAccess } from '../agentAccess';

describe('decideAgentAccess', () => {
  it('rejects with 401 when there is no authenticated user', () => {
    expect(decideAgentAccess(null, null)).toEqual({
      allowed: false,
      status: 401,
      error: 'Authentication required',
    });
  });

  it('rejects with 403 when the user has no profile', () => {
    expect(decideAgentAccess('u1', null)).toMatchObject({ allowed: false, status: 403 });
  });

  it('rejects a client with 403', () => {
    expect(decideAgentAccess('u1', { role: 'client', agency_id: null })).toMatchObject({
      allowed: false,
      status: 403,
    });
  });

  it('rejects an owner with 403 because owners do not publish', () => {
    expect(decideAgentAccess('u1', { role: 'owner', agency_id: 'a1' })).toMatchObject({
      allowed: false,
      status: 403,
    });
  });

  it('rejects an agent without an agency with 403', () => {
    expect(decideAgentAccess('u1', { role: 'agent', agency_id: null })).toMatchObject({
      allowed: false,
      status: 403,
    });
  });

  it('allows an agent and returns the identity to stamp on listings', () => {
    expect(decideAgentAccess('u1', { role: 'agent', agency_id: 'a1' })).toEqual({
      allowed: true,
      userId: 'u1',
      agencyId: 'a1',
    });
  });
});
