import {
  ADD_AGENT_OUTCOMES,
  INVITE_EMAIL_PATTERN,
  MAX_INVITE_EMAIL_LENGTH,
  MIN_INVITE_EMAIL_LENGTH,
} from '../constants/agentInvites';
import { AddAgentOutcome } from '../types/auth';

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidInviteEmail(raw: string): boolean {
  const email = normalizeInviteEmail(raw);
  return (
    email.length >= MIN_INVITE_EMAIL_LENGTH &&
    email.length <= MAX_INVITE_EMAIL_LENGTH &&
    INVITE_EMAIL_PATTERN.test(email)
  );
}

export function isAddAgentOutcome(value: unknown): value is AddAgentOutcome {
  return typeof value === 'string' && (ADD_AGENT_OUTCOMES as readonly string[]).includes(value);
}
