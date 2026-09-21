import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { BurgerMenuItemKey, getMenuItems } from '../components/BurgerMenu.items';
import { useAuth } from './useAuth';
import { useLabels } from './useLabels';

export type MenuActionOverrides = Partial<Record<BurgerMenuItemKey, () => void>>;

export function useAppMenu(overrides: MenuActionOverrides = {}) {
  const router = useRouter();
  const { status, capabilities, signOut } = useAuth();
  const labels = useLabels();
  const [isOpen, setIsOpen] = useState(false);

  const items = useMemo(() => getMenuItems(capabilities, status), [capabilities, status]);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const select = useCallback(
    (key: string) => {
      const actions: Partial<Record<string, () => void>> = {
        search: () => router.push('/'),
        new_chat: () => router.push('/'),
        register: () => router.push({ pathname: '/', params: { startRegistration: '1' } }),
        sign_in: () => router.push('/sign-in'),
        sign_out: () => {
          signOut().catch(() => Alert.alert(labels.auth.signOutErrorTitle, labels.auth.signOutErrorMessage));
        },
        create_agency: () => router.push('/create-agency'),
        my_agency: () => router.push('/agency'),
        saved: () => Alert.alert(labels.burgerMenu.savedDraftsTitle, labels.burgerMenu.savedDraftsMessage),
        settings: () => Alert.alert(labels.burgerMenu.settingsTitle, labels.burgerMenu.settingsMessage),
        help: () => Alert.alert(labels.burgerMenu.helpTitle, labels.burgerMenu.helpMessage),
        ...overrides,
      };
      actions[key]?.();
    },
    [router, signOut, labels, overrides]
  );

  return { open, close, menuProps: { visible: isOpen, onClose: close, onSelectMenuItem: select, items } };
}
