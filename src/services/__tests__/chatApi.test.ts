import { sendChatQuery } from '../chatApi';

describe('chatApi - sendChatQuery', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sends POST request and returns chat response on success', async () => {
    const mockApiResponse = {
      answer: 'Found 2 apartments in Austin',
      data: [
        {
          id: 'test-prop-1',
          title: 'Austin Condo',
          property_type: 'Apartment',
          price: 350000,
          bedrooms: 2,
          bathrooms: 2,
          square_feet: 1000,
          city: 'Austin',
          address: '123 Main St',
          status: 'Available',
          image_url: 'https://example.com/img.jpg',
          images: [],
        },
      ],
      applied_filters: { city: 'Austin' },
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockApiResponse),
    } as any);

    const result = await sendChatQuery('Austin 2-bed under $400k');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Austin 2-bed under $400k' }),
      })
    );
    expect(result).toEqual(mockApiResponse);
  });

  it('throws error when server responds with error status', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: jest.fn().mockResolvedValueOnce({ error: 'LLM synthesis failure' }),
    } as any);

    await expect(sendChatQuery('test query')).rejects.toThrow(
      'LLM synthesis failure'
    );
  });

  it('falls back to direct Supabase query when API server is unreachable', async () => {
    const mockDbData = [
      {
        id: 'db-prop-1',
        title: 'Austin Condo',
        property_type: 'Apartment',
        price: 350000,
        bedrooms: 2,
        bathrooms: 2,
        square_feet: 1000,
        city: 'Austin',
        address: '123 Main St',
        status: 'Available',
        image_url: 'https://example.com/img.jpg',
        images: [],
      },
    ];

    global.fetch = jest.fn((url: any) => {
      if (typeof url === 'string' && url.includes(':3001')) {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
      // Supabase mock response
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-range': '0-0/1' }),
        json: async () => mockDbData,
        text: async () => JSON.stringify(mockDbData),
      } as any);
    });

    const result = await sendChatQuery('Austin 2-bed under $400k');

    expect(result).toBeDefined();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Austin Condo');
    expect(result.answer).toContain('database');
  });
});
