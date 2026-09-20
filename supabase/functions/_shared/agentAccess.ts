export interface AgentProfileRow {
  role: string;
  agency_id: string | null;
}

export type AgentAccessDecision =
  | { allowed: true; userId: string; agencyId: string }
  | { allowed: false; status: 401 | 403; error: string };

export function decideAgentAccess(
  userId: string | null,
  profile: AgentProfileRow | null
): AgentAccessDecision {
  if (!userId) {
    return { allowed: false, status: 401, error: 'Authentication required' };
  }
  if (!profile || profile.role !== 'agent' || !profile.agency_id) {
    return { allowed: false, status: 403, error: 'Only agents can perform this action' };
  }
  return { allowed: true, userId, agencyId: profile.agency_id };
}
