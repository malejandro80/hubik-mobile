import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { START_EXAMPLES_BY_AUDIENCE, START_SEARCH_QUERY } from '../constants/startScreen';
import { REGISTER_COMMAND } from '../lib/chatRegistration';
import { getStartActions, getStartAudience, StartActionKey } from '../lib/startActions';
import { useAuth } from './useAuth';

export function useStartScreen(handleSend: (text: string) => void) {
  const router = useRouter();
  const { status, profile, capabilities } = useAuth();

  const actions = useMemo(() => getStartActions(capabilities, status), [capabilities, status]);
  const audience = getStartAudience(status, profile?.role ?? null);
  const name = profile?.displayName?.trim() || null;

  const onAction = useCallback(
    (key: StartActionKey) => {
      const handlers: Record<StartActionKey, () => void> = {
        search: () => handleSend(START_SEARCH_QUERY),
        register: () => handleSend(REGISTER_COMMAND),
        sign_in: () => router.push('/sign-in'),
        my_agency: () => router.push('/agency'),
        create_agency: () => router.push('/create-agency'),
      };
      handlers[key]();
    },
    [handleSend, router]
  );

  const onExample = useCallback((text: string) => handleSend(text), [handleSend]);

  return { name, audience, actions, examples: START_EXAMPLES_BY_AUDIENCE[audience], onAction, onExample };
}
