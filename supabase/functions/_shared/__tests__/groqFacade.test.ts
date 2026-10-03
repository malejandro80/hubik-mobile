import { groqChatJson, groqTranscribeAudio } from '../groqFacade';

describe('groqFacade', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('groqChatJson', () => {
    it('returns parsed json from choices', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ description: 'Casa moderna' }),
              },
            },
          ],
        }),
      });

      const result = await groqChatJson<{ description: string }>({
        key: 'groq-key',
        userPrompt: 'describe la casa',
        systemInstruction: 'eres un redactor',
        logTag: 'groq-test',
      });

      expect(result).toEqual({ description: 'Casa moderna' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer groq-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('returns null on non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const result = await groqChatJson({
        key: 'groq-key',
        userPrompt: 'prompt',
      });

      expect(result).toBeNull();
    });

    it('returns null on empty content', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '' } }],
        }),
      });

      const result = await groqChatJson({
        key: 'groq-key',
        userPrompt: 'prompt',
      });

      expect(result).toBeNull();
    });
  });

  describe('groqTranscribeAudio', () => {
    it('returns trimmed transcript on success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          text: '   Apartamento en alquiler Valencia   ',
        }),
      });

      const result = await groqTranscribeAudio({
        key: 'groq-key',
        audio: { data: 'aGVsbG8=', mimeType: 'audio/m4a' },
      });

      expect(result).toBe('Apartamento en alquiler Valencia');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer groq-key' },
          body: expect.any(FormData),
        })
      );
    });

    it('throws when status is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(
        groqTranscribeAudio({
          key: 'groq-key',
          audio: { data: 'aGVsbG8=', mimeType: 'audio/m4a' },
        })
      ).rejects.toThrow('Groq transcription request failed (400)');
    });

    it('throws when text is empty', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ text: '   ' }),
      });

      await expect(
        groqTranscribeAudio({
          key: 'groq-key',
          audio: { data: 'aGVsbG8=', mimeType: 'audio/m4a' },
        })
      ).rejects.toThrow('No pude entender la nota de voz');
    });
  });
});
