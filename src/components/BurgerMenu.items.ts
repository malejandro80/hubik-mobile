import Ionicons from '@expo/vector-icons/Ionicons';
import { labels } from '../constants/labels';
import { AuthStatus, RoleCapabilities } from '../types/auth';

export type BurgerMenuItemKey =
  | 'search'
  | 'register'
  | 'new_chat'
  | 'saved'
  | 'settings'
  | 'help'
  | 'sign_in'
  | 'sign_out'
  | 'create_agency'
  | 'my_agency';

export interface BurgerMenuItem {
  key: BurgerMenuItemKey;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}

export const MENU_ITEMS: BurgerMenuItem[] = [
  { key: 'search', title: labels.burgerMenu.menuItems.search, icon: 'search-outline' },
  { key: 'register', title: labels.burgerMenu.menuItems.register, icon: 'add-circle-outline', badge: labels.burgerMenu.menuItems.badgeNew },
  { key: 'new_chat', title: labels.burgerMenu.menuItems.newChat, icon: 'refresh-outline' },
  { key: 'saved', title: labels.burgerMenu.menuItems.saved, icon: 'bookmark-outline' },
  { key: 'settings', title: labels.burgerMenu.menuItems.settings, icon: 'settings-outline' },
  { key: 'help', title: labels.burgerMenu.menuItems.help, icon: 'help-circle-outline' },
];

const ACCOUNT_ITEMS: Record<'sign_in' | 'sign_out' | 'create_agency' | 'my_agency', BurgerMenuItem> = {
  sign_in: { key: 'sign_in', title: labels.burgerMenu.menuItems.signIn, icon: 'log-in-outline' },
  sign_out: { key: 'sign_out', title: labels.burgerMenu.menuItems.signOut, icon: 'log-out-outline' },
  create_agency: { key: 'create_agency', title: labels.burgerMenu.menuItems.createAgency, icon: 'business-outline' },
  my_agency: { key: 'my_agency', title: labels.burgerMenu.menuItems.myAgency, icon: 'briefcase-outline' },
};

export function getMenuItems(capabilities: RoleCapabilities, status: AuthStatus): BurgerMenuItem[] {
  const baseItems = MENU_ITEMS.filter(
    (item) => item.key !== 'register' || capabilities.canRegisterProperty
  );
  const accountItems: BurgerMenuItem[] = [];
  if (status === 'signedOut') accountItems.push(ACCOUNT_ITEMS.sign_in);
  if (capabilities.canCreateAgency) accountItems.push(ACCOUNT_ITEMS.create_agency);
  if (capabilities.canViewAgencyListings) accountItems.push(ACCOUNT_ITEMS.my_agency);
  if (status === 'signedIn') accountItems.push(ACCOUNT_ITEMS.sign_out);
  return [...baseItems, ...accountItems];
}
