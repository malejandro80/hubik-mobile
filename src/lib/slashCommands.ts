import { SLASH_COMMANDS, SLASH_PREFIX, SlashCommandDefinition } from '../constants/slashCommands';
import { AuthStatus, RoleCapabilities } from '../types/auth';

export type SlashCommand = SlashCommandDefinition;

export type SlashMenuState =
  | { kind: 'hidden' }
  | { kind: 'note' }
  | { kind: 'commands'; commands: SlashCommand[] };

const HIDDEN: SlashMenuState = { kind: 'hidden' };

export function resolveSlashMenu(
  text: string,
  capabilities: RoleCapabilities,
  status: AuthStatus
): SlashMenuState {
  if (!text.startsWith(SLASH_PREFIX) || status === 'loading') return HIDDEN;

  const available = SLASH_COMMANDS.filter((item) => capabilities[item.capability]);
  if (available.length === 0) return { kind: 'note' };

  const typed = text.toLowerCase();
  const matching = available.filter((item) => item.command.startsWith(typed));
  return matching.length > 0 ? { kind: 'commands', commands: matching } : HIDDEN;
}
