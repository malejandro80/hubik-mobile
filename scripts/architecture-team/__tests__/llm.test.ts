import { GoogleGenAI } from '@google/genai';
import { fallbackText, GeminiRoleProvider } from '../llm';

jest.mock('@google/genai');

function mockGemini(): {
  generateContent: jest.Mock;
} {
  const generateContent = jest.fn();
  (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({
    models: { generateContent },
  }));
  return { generateContent };
}

describe('fallbackText', () => {
  it('returns non-empty deterministic content per role', () => {
    for (const role of ['lead', 'systems', 'spec', 'security', 'qa']) {
      const text = fallbackText(
        role as Parameters<typeof fallbackText>[0],
        'auth'
      );
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

describe('GeminiRoleProvider', () => {
  it('returns model text trimmed', async () => {
    const { generateContent } = mockGemini();
    generateContent.mockResolvedValue({ text: '  RESULT  ' });
    const provider = new GeminiRoleProvider('test-key');
    await expect(provider.generate('spec', 'auth', '')).resolves.toBe('RESULT');
  });

  it('falls back when the model returns empty text', async () => {
    const { generateContent } = mockGemini();
    generateContent.mockResolvedValue({ text: '   ' });
    const provider = new GeminiRoleProvider('test-key');
    const text = await provider.generate('qa', 'auth', '');
    expect(text).toBe(fallbackText('qa', 'auth'));
  });

  it('falls back when the model call rejects', async () => {
    const { generateContent } = mockGemini();
    generateContent.mockRejectedValue(new Error('boom'));
    const provider = new GeminiRoleProvider('test-key');
    const text = await provider.generate('lead', 'auth', '');
    expect(text).toBe(fallbackText('lead', 'auth'));
  });
});
