import { geminiEmbedText, geminiGenerateJson, geminiGenerateText } from '../geminiFacade';

describe('geminiFacade', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('geminiGenerateJson', () => {
    it('returns parsed json from candidates', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ city: 'Valencia', price: 150000 }) }],
              },
            },
          ],
        }),
      });

      const result = await geminiGenerateJson<{ city: string; price: number }>({
        model: 'gemini-3.5-flash-lite',
        key: 'test-key',
        prompt: 'busco piso en Valencia',
        systemInstruction: 'extrae filtros',
        logTag: 'test',
      });

      expect(result).toEqual({ city: 'Valencia', price: 150000 });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=test-key',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('uses custom parser when provided', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'custom raw text' }],
              },
            },
          ],
        }),
      });

      const customParser = jest.fn().mockReturnValue({ parsed: true });

      const result = await geminiGenerateJson({
        model: 'gemini-3.5-flash-lite',
        key: 'test-key',
        prompt: 'test prompt',
        parser: customParser,
      });

      expect(result).toEqual({ parsed: true });
      expect(customParser).toHaveBeenCalledWith('custom raw text');
    });

    it('returns null on non-ok status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limited',
      });

      const result = await geminiGenerateJson({
        model: 'gemini-3.5-flash-lite',
        key: 'test-key',
        prompt: 'test',
      });

      expect(result).toBeNull();
    });

    it('returns null when candidates are empty', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [] }),
      });

      const result = await geminiGenerateJson({
        model: 'gemini-3.5-flash-lite',
        key: 'test-key',
        prompt: 'test',
      });

      expect(result).toBeNull();
    });

    it('catches and logs exceptions returning null', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const result = await geminiGenerateJson({
        model: 'gemini-3.5-flash-lite',
        key: 'test-key',
        prompt: 'test',
        logTag: 'network-test',
      });

      expect(result).toBeNull();
    });
  });

  describe('geminiGenerateText', () => {
    it('returns string text from candidates', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Hermosa vivienda en zona norte' }],
              },
            },
          ],
        }),
      });

      const result = await geminiGenerateText({
        model: 'gemini-2.5-flash',
        key: 'test-key',
        prompt: 'describe esta propiedad',
      });

      expect(result).toBe('Hermosa vivienda en zona norte');
    });

    it('returns null when text is missing or whitespace', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '   ' }],
              },
            },
          ],
        }),
      });

      const result = await geminiGenerateText({
        model: 'gemini-2.5-flash',
        key: 'test-key',
        prompt: 'test',
      });

      expect(result).toBeNull();
    });
  });

  describe('geminiEmbedText', () => {
    it('returns normalized 768-dim vector', async () => {
      const mockValues = Array.from({ length: 768 }, (_, i) => i + 1);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          embedding: { values: mockValues },
        }),
      });

      const result = await geminiEmbedText({
        key: 'test-key',
        text: 'apartamento con piscina',
        taskType: 'RETRIEVAL_QUERY',
      });

      expect(result).toHaveLength(768);
      const norm = Math.sqrt(result!.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1, 5);
    });

    it('returns null on unexpected shape', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          embedding: { values: [1, 2, 3] },
        }),
      });

      const result = await geminiEmbedText({
        key: 'test-key',
        text: 'test',
        taskType: 'RETRIEVAL_DOCUMENT',
      });

      expect(result).toBeNull();
    });
  });
});
