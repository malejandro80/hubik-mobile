import Ionicons from '@expo/vector-icons/Ionicons';
import { labels } from '../constants/labels';

export type BurgerMenuItemKey =
  | 'search'
  | 'register'
  | 'new_chat'
  | 'saved'
  | 'settings'
  | 'help';

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
