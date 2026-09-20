const AUTH_CODE_PATTERN = /[?&]code=([^&#]+)/;
const WEB_URL_PATTERN = /^https?:\/\//i;

export const AUTH_CALLBACK_PATH = 'auth/callback';

export function extractAuthCode(url: string): string | null {
  if (!url || WEB_URL_PATTERN.test(url)) return null;
  const match = AUTH_CODE_PATTERN.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
