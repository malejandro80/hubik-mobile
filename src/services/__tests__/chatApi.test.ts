import { sendChatQuery, parsePromptFilters } from '../chatApi';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('chatApi - sendChatQuery (Supabase Edge Function)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes chat-query Edge Function and returns response on success', async () => {
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

    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: mockApiResponse,
      error: null,
    });

    const result = await sendChatQuery('Austin 2-bed under $400k');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('chat-query', {
      body: { message: 'Austin 2-bed under $400k' },
    });
    expect(result).toEqual(mockApiResponse);
  });

  it('falls back to direct Supabase database query when Edge Function returns error', async () => {
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

    // Edge Function fails
    (supabase.functions.invoke as jest.Mock).mockResolvedValueOnce({
      data: null,
      error: new Error('Edge Function invocation error'),
    });

    // Mock direct query chain
    const mockOrder = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValueOnce({ data: mockDbData, error: null });
    const mockSelect = jest.fn().mockReturnValue({
      ilike: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: mockOrder,
      limit: mockLimit,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    const result = await sendChatQuery('Austin 2-bed under $400k');

    expect(supabase.functions.invoke).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Austin Condo');
    expect(result.answer).toContain('database');
  });

  it('parsePromptFilters correctly extracts structured filters', () => {
    const filters = parsePromptFilters('Denver 3-bed house under 700k');
    expect(filters.city).toBe('Denver');
    expect(filters.property_type).toBe('Single Family');
    expect(filters.min_bedrooms).toBe(3);
    expect(filters.max_price).toBe(700000);
  });
});
