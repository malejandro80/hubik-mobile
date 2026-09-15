import type { ArchitectureState } from './types';

export interface GatekeeperVerdict {
  status: 'APPROVED' | 'REVISION_NEEDED';
  iteration: number;
  feedback: string[];
}

export function evaluateGatekeeper(state: ArchitectureState): GatekeeperVerdict {
  const problems: string[] = [];
  if (!state.topologyNotes.trim()) problems.push('topologyNotes empty');
  if (!state.specDraft.trim()) problems.push('specDraft empty');
  if (!state.securityFindings.trim()) problems.push('securityFindings empty');
  if (!state.qaPlan.trim()) problems.push('qaPlan empty');
  return {
    status: problems.length === 0 ? 'APPROVED' : 'REVISION_NEEDED',
    iteration: state.iteration + 1,
    feedback: problems,
  };
}

export type GatekeeperRoute = 'approve' | 'revision' | 'escalate';

export function routeAfterGatekeeper(state: ArchitectureState): GatekeeperRoute {
  if (state.gatekeeperStatus === 'REVISION_NEEDED') {
    return state.iteration >= 2 ? 'escalate' : 'revision';
  }
  return 'approve';
}
