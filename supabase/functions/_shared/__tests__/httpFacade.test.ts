import { httpPostFormData, httpPostJson } from '../httpFacade';

describe('httpFacade', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('httpPostJson', () => {
    it('returns parsed data on 200 response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, count: 5 }),
      });

      const response = await httpPostJson<{ success: boolean; count: number }>(
        'https://example.com/api',
        { query: 'test' }
      );

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true, count: 5 });
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
        signal: expect.any(Object),
      });
    });

    it('returns errorText when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      const response = await httpPostJson('https://example.com/api', {});

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(response.data).toBeNull();
      expect(response.errorText).toBe('Not Found');
    });

    it('passes custom headers', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await httpPostJson(
        'https://example.com/api',
        {},
        { headers: { Authorization: 'Bearer token123' } }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token123',
          },
        })
      );
    });

    it('handles aborted signal early', async () => {
      const abortController = new AbortController();
      abortController.abort();

      global.fetch = jest.fn().mockImplementation((_url, init) => {
        if (init?.signal?.aborted) {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          return Promise.reject(err);
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      await expect(
        httpPostJson('https://example.com/api', {}, { signal: abortController.signal })
      ).rejects.toThrow();
    });
  });

  describe('httpPostFormData', () => {
    it('sends FormData and returns parsed json on success', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ transcript: 'hello world' }),
      });

      const formData = new FormData();
      formData.append('key', 'val');

      const response = await httpPostFormData<{ transcript: string }>(
        'https://example.com/upload',
        formData,
        { headers: { Authorization: 'Bearer test' } }
      );

      expect(response.ok).toBe(true);
      expect(response.data).toEqual({ transcript: 'hello world' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/upload',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          headers: { Authorization: 'Bearer test' },
        })
      );
    });

    it('returns errorText when FormData request is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Error',
      });

      const formData = new FormData();
      const response = await httpPostFormData('https://example.com/upload', formData);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(response.data).toBeNull();
      expect(response.errorText).toBe('Internal Error');
    });
  });
});
