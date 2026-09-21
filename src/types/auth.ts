import { ADD_AGENT_OUTCOMES } from '../constants/agentInvites';

export type Role = 'client' | 'agent' | 'owner';

export type AuthProviderName = 'google' | 'apple';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type SignInOutcome = 'signedIn' | 'cancelled';

export interface Profile {
  userId: string;
  role: Role;
  agencyId: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
}

export interface RoleCapabilities {
  canRegisterProperty: boolean;
  canCreateAgency: boolean;
  canViewAgencyListings: boolean;
}

export interface AuthState {
  status: AuthStatus;
  profile: Profile | null;
  capabilities: RoleCapabilities;
  signIn: (provider: AuthProviderName) => Promise<SignInOutcome>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export type AddAgentOutcome = (typeof ADD_AGENT_OUTCOMES)[number];

export interface AgencyAgent {
  userId: string;
  displayName: string | null;
}

export interface AgentInvite {
  id: string;
  email: string;
  createdAt: string;
}
