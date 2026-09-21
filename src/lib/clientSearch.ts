import {
  CLIENT_SEARCH_MAX_CHARS,
  CLIENT_SEARCH_MIN_CHARS,
  CLIENT_SEARCH_RATE_LIMIT_MESSAGE,
} from '../constants/clientSearch';
import { ClientCandidate } from '../types/auth';

export class RateLimitedError extends Error {
  constructor() {
    super(CLIENT_SEARCH_RATE_LIMIT_MESSAGE);
    this.name = 'RateLimitedError';
  }
}

export function normalizeClientQuery(raw: string): string {
  return raw.trim().slice(0, CLIENT_SEARCH_MAX_CHARS);
}

export function shouldSearchClients(raw: string): boolean {
  return normalizeClientQuery(raw).length >= CLIENT_SEARCH_MIN_CHARS;
}

export function isRateLimitedError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { message?: unknown }).message === CLIENT_SEARCH_RATE_LIMIT_MESSAGE;
}

interface CandidateRow {
  user_id: string;
  display_name: string | null;
  masked_email: string;
}

function isCandidateRow(row: unknown): row is CandidateRow {
  if (typeof row !== 'object' || row === null) return false;
  const candidate = row as Record<string, unknown>;
  return (
    typeof candidate.user_id === 'string' &&
    typeof candidate.masked_email === 'string' &&
    (candidate.display_name === null || typeof candidate.display_name === 'string')
  );
}

export function toClientCandidates(rows: unknown): ClientCandidate[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(isCandidateRow).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    maskedEmail: row.masked_email,
  }));
}
