import {
  sendChatQuery,
  parsePromptFilters,
  fetchDynamicSuggestions,
} from '../chatApi';
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
          square_meters: 93,
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
        square_meters: 93,
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
    expect(result.answer).toContain('base de datos');
  });

  it('parsePromptFilters correctly extracts structured filters', () => {
    const filters = parsePromptFilters('Denver 3-bed house under 700k');
    expect(filters.city).toBe('Denver');
    expect(filters.property_type).toBe('Single Family');
    expect(filters.min_bedrooms).toBe(3);
    expect(filters.max_price).toBe(700000);
  });

  it('parsePromptFilters extracts metric area filters (m2, m², sqm)', () => {
    const filtersM2 = parsePromptFilters('Miami condo under 120 m2');
    expect(filtersM2.max_square_meters).toBe(120);

    const filtersSqm = parsePromptFilters('Austin apartment over 80 sqm');
    expect(filtersSqm.min_square_meters).toBe(80);

    const filtersSqMetres = parsePromptFilters('Seattle home under 200 square meters');
    expect(filtersSqMetres.max_square_meters).toBe(200);

    // Legacy feet query converts to metric m²
    const filtersFeet = parsePromptFilters('Denver house under 1000 sqft');
    expect(filtersFeet.max_square_meters).toBe(93);
  });

  it('parsePromptFilters extracts Spanish natural language queries', () => {
    const filters = parsePromptFilters('departamentos en Austin de menos de 100 m2');
    expect(filters.city).toBe('Austin');
    expect(filters.property_type).toBe('Apartment');
    expect(filters.max_square_meters).toBe(100);

    const filtersHouse = parsePromptFilters('casas familiares en Miami con más de 3 habitaciones por menos de 500k');
    expect(filtersHouse.city).toBe('Miami');
    expect(filtersHouse.property_type).toBe('Single Family');
    expect(filtersHouse.min_bedrooms).toBe(3);
    expect(filtersHouse.max_price).toBe(500000);

    const filtersSort = parsePromptFilters('los departamentos más baratos en Denver');
    expect(filtersSort.city).toBe('Denver');
    expect(filtersSort.property_type).toBe('Apartment');
    expect(filtersSort.sort_by).toBe('price_asc');
  });

  it('fetchDynamicSuggestions generates dynamic query phrases in Spanish from Supabase properties', async () => {
    const mockData = [
      { city: 'Austin', property_type: 'Condo', price: 385000 },
      { city: 'Miami', property_type: 'Apartment', price: 890000 },
    ];

    const mockLimit = jest.fn().mockResolvedValueOnce({ data: mockData, error: null });
    const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit });
    const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const suggestions = await fetchDynamicSuggestions();

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toBe('Condominios en Austin por menos de $400k');
    expect(suggestions[1]).toBe('Departamentos en Miami por menos de $900k');
  });
});
