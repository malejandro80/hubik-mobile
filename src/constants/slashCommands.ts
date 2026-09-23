import { REGISTER_COMMAND } from '../lib/chatRegistration';
import { RoleCapabilities } from '../types/auth';

export const SLASH_PREFIX = '/';

export const CLEAR_COMMAND = '/limpiar';

export type SlashCommandKey = 'register' | 'clear';

export interface SlashCommandDefinition {
  key: SlashCommandKey;
  command: string;
  capability?: keyof RoleCapabilities;
}

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  { key: 'register', command: REGISTER_COMMAND, capability: 'canRegisterProperty' },
  { key: 'clear', command: CLEAR_COMMAND },
];
