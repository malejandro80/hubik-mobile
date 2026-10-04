import { normalizePlace } from './cityMatch.ts';
import { PromptGuard } from './promptGuard.ts';
import { SENSITIVE_TOPIC_PATTERNS, THREAT_PATTERNS } from './promptGuardConstants.ts';

export type SensitiveTopic = (typeof SENSITIVE_TOPIC_PATTERNS)[number][0];

export type ThreatCategory = (typeof THREAT_PATTERNS)[number][0];

export function threatCategory(texts: string[]): ThreatCategory | null {
  for (const text of texts) {
    const normalized = normalizePlace(text);
    const hit = THREAT_PATTERNS.find(([, pattern]) => pattern.test(normalized));
    if (hit) return hit[0];
  }
  return null;
}

export function sensitiveTopic(question: string): SensitiveTopic | null {
  const text = normalizePlace(question);
  return SENSITIVE_TOPIC_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

export const regexPromptGuard: PromptGuard = {
  inspect({ question, context }) {
    const threat = threatCategory([question, ...context]);
    if (threat) return Promise.resolve({ allowed: false, reason: 'threat', category: threat });
    const topic = sensitiveTopic(question);
    if (topic) return Promise.resolve({ allowed: false, reason: 'sensitive', category: topic });
    return Promise.resolve({ allowed: true });
  },
};
