import {
  AVATAR_METADATA_KEYS,
  HTTPS_URL_PATTERN,
  MAX_INITIALS,
  WHITESPACE_PATTERN,
} from '../constants/userDisplay';

export function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .split(WHITESPACE_PATTERN)
    .filter(Boolean)
    .slice(0, MAX_INITIALS)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function getAvatarUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const record = metadata as Record<string, unknown>;
  for (const key of AVATAR_METADATA_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && HTTPS_URL_PATTERN.test(value)) return value;
  }
  return null;
}
