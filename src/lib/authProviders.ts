import { labels } from '../constants/labels';
import { AuthProviderName } from '../types/auth';

export interface AuthProviderOption {
  provider: AuthProviderName;
  label: string;
}

export const AUTH_PROVIDER_OPTIONS: AuthProviderOption[] = [
  { provider: 'google', label: labels.auth.continueWithGoogle },
  { provider: 'apple', label: labels.auth.continueWithApple },
];

export function describeAuthError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
