import { AuthStatus, Role, RoleCapabilities } from '../types/auth';

export type StartActionKey = 'search' | 'sign_in' | 'register' | 'my_agency' | 'create_agency';

export type StartAudience = 'visitor' | Role;

export function getStartActions(capabilities: RoleCapabilities, status: AuthStatus): StartActionKey[] {
  const actions: StartActionKey[] = [];
  if (capabilities.canViewAgencyListings) actions.push('my_agency');
  if (capabilities.canRegisterProperty) actions.push('register');
  actions.push('search');
  if (capabilities.canCreateAgency) actions.push('create_agency');
  if (status === 'signedOut') actions.push('sign_in');
  return actions;
}

export function getStartAudience(status: AuthStatus, role: Role | null): StartAudience {
  return status === 'signedIn' && role ? role : 'visitor';
}
