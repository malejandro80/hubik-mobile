import {
  INTERNATIONAL_PREFIX,
  PHONE_SEPARATORS_PATTERN,
  WHATSAPP_BASE_URL,
  WHATSAPP_PATTERN,
} from '../constants/whatsapp';
import { Profile } from '../types/auth';

export function normalizeWhatsApp(input: string): string | null {
  const compact = input.trim().replace(PHONE_SEPARATORS_PATTERN, '');
  const phone = compact.startsWith(INTERNATIONAL_PREFIX) ? `+${compact.slice(INTERNATIONAL_PREFIX.length)}` : compact;
  return WHATSAPP_PATTERN.test(phone) ? phone : null;
}

export function whatsAppUrl(phone: string, text: string): string {
  return `${WHATSAPP_BASE_URL}${phone.replace('+', '')}?text=${encodeURIComponent(text)}`;
}

export function canContactAgents(profile: Profile | null): boolean {
  return !profile || profile.role === 'client';
}
