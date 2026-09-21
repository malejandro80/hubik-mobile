import {
  ACCENT_MARKS_PATTERN,
  ADD_WORDS,
  AGENT_WORDS,
  CANCEL_WORDS,
  COUNT_PATTERN,
  EMAIL_IN_TEXT_PATTERN,
  HOME_TARGET_PATTERN,
  HOME_WORDS,
  LIST_WORDS,
  NON_WORD_PATTERN,
  TEAM_WORDS,
  WHITESPACE_PATTERN,
  WHO_PATTERN,
} from '../constants/agencyCommands';

export type AgencyCommand =
  | { type: 'add_agent'; email: string }
  | { type: 'add_agent_missing_email' }
  | { type: 'cancel_invite'; email: string }
  | { type: 'count_team' }
  | { type: 'list_team' }
  | { type: 'go_home' };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(ACCENT_MARKS_PATTERN, '')
    .replace(NON_WORD_PATTERN, ' ')
    .replace(new RegExp(WHITESPACE_PATTERN.source, 'g'), ' ')
    .trim();
}

const hasAny = (tokens: string[], words: string[]): boolean => tokens.some((token) => words.includes(token));

export function parseAgencyCommand(text: string): AgencyCommand | null {
  const emailMatch = text.match(EMAIL_IN_TEXT_PATTERN);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;
  const rest = normalize(emailMatch ? text.replace(emailMatch[0], ' ') : text);
  if (!rest) return null;

  const tokens = rest.split(WHITESPACE_PATTERN);

  if (email) {
    if (hasAny(tokens, CANCEL_WORDS)) return { type: 'cancel_invite', email };
    if (hasAny(tokens, ADD_WORDS) || hasAny(tokens, AGENT_WORDS)) return { type: 'add_agent', email };
    return null;
  }

  if (hasAny(tokens, ADD_WORDS) && hasAny(tokens, AGENT_WORDS)) return { type: 'add_agent_missing_email' };
  if (COUNT_PATTERN.test(rest) && hasAny(tokens, TEAM_WORDS)) return { type: 'count_team' };
  if ((WHO_PATTERN.test(rest) || hasAny(tokens, LIST_WORDS)) && hasAny(tokens, TEAM_WORDS)) {
    return { type: 'list_team' };
  }
  if (hasAny(tokens, HOME_WORDS) && HOME_TARGET_PATTERN.test(rest)) return { type: 'go_home' };
  return null;
}
