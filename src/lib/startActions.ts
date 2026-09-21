import { AuthStatus, RoleCapabilities } from '../types/auth';

export type StartActionKey = 'search' | 'sign_in' | 'register' | 'my_agency';

export function getStartActions(capabilities: RoleCapabilities, status: AuthStatus): StartActionKey[] {
  const actions: StartActionKey[] = ['search'];
  if (status === 'signedOut') actions.push('sign_in');
  if (capabilities.canRegisterProperty) actions.push('register');
  if (capabilities.canViewAgencyListings) actions.push('my_agency');
  return actions;
}
