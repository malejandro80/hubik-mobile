import { GoogleGenAI } from '@google/genai';
import type { Role, RoleProvider } from './types';

export const ROLE_SYSTEM_PROMPTS: Record<Role, string> = {
  lead:
    'You are the Lead Mobile Architect. Scope the request, define platform ' +
    'boundaries (iOS/Android), and return compact markdown notes.',
  systems:
    'You are the Systems & Modularity Architect. Enforce the Ponytail ' +
    'YAGNI ladder and Expo Router boundaries. Return markdown topology notes.',
  spec:
    'You are the Spec & API Architect. Write a formal RFC draft with ' +
    'goals, non-goals, contracts, and test plan. Return markdown.',
  security:
    'You are the Mobile Security Architect. Run STRIDE / OWASP Mobile ' +
    'checks: secure-store, deep links, client secrets. Return markdown findings.',
  qa:
    'You are the Mobile QA Architect. Define RNTL-based TDD assertions and ' +
    'edge-case matrix. Return markdown.',
};

function buildPrompt(role: Role, intent: string, prior: string): string {
  return [
    `Squad intent: "${intent}".`,
    `Your role: ${role}.`,
    `Prior context:\n${prior || '(none)'}`,
    'Produce focused markdown for your responsibility only.',
  ].join('\n');
}

export function fallbackText(role: Role, intent: string): string {
  switch (role) {
    case 'spec':
      return `# Specification for: ${intent}\n- Status: Draft\n- Interfaces: Explicit`;
    case 'qa':
      return `## QA plan for: ${intent}\n- RNTL component tests\n- Edge-case matrix`;
    case 'security':
      return `## Security findings for: ${intent}\n- JWT -> expo-secure-store\n- No client secrets`;
    case 'systems':
      return `## Topology notes for: ${intent}\n- Expo Router in app/, logic in src/`;
    default:
      return `## Scope for: ${intent}\n- Mobile boundary: iOS + Android`;
  }
}

export class GeminiRoleProvider implements RoleProvider {
  private ai: GoogleGenAI | null;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    this.ai =
      key && key !== 'your_gemini_api_key_here'
        ? new GoogleGenAI({ apiKey: key })
        : null;
  }

  async generate(role: Role, intent: string, prior: string): Promise<string> {
    if (!this.ai) return fallbackText(role, intent);
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: buildPrompt(role, intent, prior),
        config: { systemInstruction: ROLE_SYSTEM_PROMPTS[role] },
      });
      const text = response.text?.trim() ?? '';
      return text || fallbackText(role, intent);
    } catch (error) {
      console.warn(`[arch-team] Gemini call failed for role=${role}:`, error);
      return fallbackText(role, intent);
    }
  }
}
