import { ANDROID_USER_AGENT_PATTERN, IOS_USER_AGENT_PATTERN } from '../constants/appStore';

function httpsOnly(url: string): string | null {
  const trimmed = url.trim();
  return trimmed.startsWith('https://') ? trimmed : null;
}

export function resolveStoreUrl(userAgent: string, iosUrl: string, androidUrl: string): string | null {
  const ios = httpsOnly(iosUrl);
  const android = httpsOnly(androidUrl);

  if (IOS_USER_AGENT_PATTERN.test(userAgent)) return ios;
  if (ANDROID_USER_AGENT_PATTERN.test(userAgent)) return android;
  return ios ?? android;
}
