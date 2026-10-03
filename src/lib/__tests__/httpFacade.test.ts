import { fetchBlob, postJson } from '../httpFacade';

describe('src/lib/httpFacade', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('fetchBlob', () => {
    it('returns Blob on ok response', async () => {
      const mockBlob = new Blob(['sample-data'], { type: 'image/jpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      });

      const blob = await fetchBlob('file:///path/to/image.jpg');

      expect(blob).toBe(mockBlob);
      expect(global.fetch).toHaveBeenCalledWith('file:///path/to/image.jpg');
    });

    it('throws error when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(fetchBlob('file:///missing.jpg')).rejects.toThrow(
        'Failed to fetch resource at file:///missing.jpg: 404'
      );
    });
  });

  describe('postJson', () => {
    it('sends JSON post request and returns parsed data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ results: ['item1', 'item2'] }),
      });

      const data = await postJson<{ results: string[] }>(
        'https://api.example.com/search',
        { query: 'casas' },
        { Authorization: 'Bearer token' }
      );

      expect(data).toEqual({ results: ['item1', 'item2'] });
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
        body: JSON.stringify({ query: 'casas' }),
      });
    });

    it('throws with error field from response body when not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid payload' }),
      });

      await expect(postJson('https://api.example.com/fail', {})).rejects.toThrow(
        'Invalid payload'
      );
    });
  });
});
