export interface RoleProvider {
  generate(role: Role, intent: string, prior: string): Promise<string>;
}

export type Role = 'lead' | 'systems' | 'spec' | 'security' | 'qa';

export type GatekeeperStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REVISION_NEEDED'
  | 'ESCALATED';

export interface ArchitectureState {
  intent: string;
  topologyNotes: string;
  systemsApproved: boolean;
  specDraft: string;
  securityFindings: string;
  securityApproved: boolean;
  qaPlan: string;
  gatekeeperStatus: GatekeeperStatus;
  iteration: number;
  feedback: string[];
  specPath: string;
  adrPath: string;
  visited: string[];
}
