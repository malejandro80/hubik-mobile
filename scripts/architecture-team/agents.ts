import type { ArchitectureState, RoleProvider } from './types';

type NodeFn = (state: ArchitectureState) => Promise<Partial<ArchitectureState>>;

export interface RoleNodes {
  lead: NodeFn;
  systems: NodeFn;
  spec: NodeFn;
  security: NodeFn;
  qa: NodeFn;
}

export function createNodes(provider: RoleProvider): RoleNodes {
  return {
    lead: async (state) => ({
      topologyNotes: await provider.generate('lead', state.intent, ''),
    }),
    systems: async (state) => ({
      topologyNotes: await provider.generate(
        'systems',
        state.intent,
        state.topologyNotes
      ),
      systemsApproved: true,
    }),
    spec: async (state) => ({
      specDraft: await provider.generate(
        'spec',
        state.intent,
        state.topologyNotes
      ),
    }),
    security: async (state) => {
      const findings = await provider.generate(
        'security',
        state.intent,
        state.specDraft
      );
      return {
        securityFindings: findings,
        securityApproved: findings.trim().length > 0,
      };
    },
    qa: async (state) => ({
      qaPlan: await provider.generate('qa', state.intent, state.specDraft),
    }),
  };
}
