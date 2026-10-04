import {
  fetchDynamicSuggestions,
  querySupabaseDirectly,
} from '../directSearchService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('directSearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDynamicSuggestions', () => {
    it('returns empty array when error occurs or data is empty', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({ data: null, error: new Error('DB Error') }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await fetchDynamicSuggestions();
      expect(result).toEqual([]);
    });

    it('generates rounded price suggestions from database records', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValueOnce({
          data: [
            { city: 'Valencia', property_type: 'Apartment', price: 180000 },
            { city: 'Madrid', property_type: 'Single Family', price: 320000 },
          ],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await fetchDynamicSuggestions();
      expect(result.length).toBe(2);
      expect(result[0]).toContain('Valencia');
      expect(result[1]).toContain('Madrid');
    });
  });

  describe('querySupabaseDirectly', () => {
    it('throws when database query returns error', async () => {
      const mockChain: any = {};
      mockChain.select = jest.fn().mockReturnValue(mockChain);
      mockChain.ilike = jest.fn().mockReturnValue(mockChain);
      mockChain.order = jest.fn().mockReturnValue(mockChain);
      mockChain.limit = jest.fn().mockResolvedValueOnce({ data: null, error: { message: 'Connection timeout' } });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await expect(querySupabaseDirectly('Valencia')).rejects.toThrow('Database query error: Connection timeout');
    });

    it('returns empty results message when no rows match', async () => {
      const mockChain: any = {};
      mockChain.select = jest.fn().mockReturnValue(mockChain);
      mockChain.order = jest.fn().mockReturnValue(mockChain);
      mockChain.limit = jest.fn().mockResolvedValueOnce({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await querySupabaseDirectly('fantasia');
      expect(result.data).toEqual([]);
      expect(result.answer).toContain('No encontré propiedades');
    });

    it('filters by the operation the user asked for', async () => {
      const mockChain: any = {};
      mockChain.select = jest.fn().mockReturnValue(mockChain);
      mockChain.eq = jest.fn().mockReturnValue(mockChain);
      mockChain.order = jest.fn().mockReturnValue(mockChain);
      mockChain.limit = jest.fn().mockResolvedValueOnce({ data: [], error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      await querySupabaseDirectly('apartamentos en alquiler');

      expect(mockChain.eq).toHaveBeenCalledWith('property_type', 'Apartment');
      expect(mockChain.eq).toHaveBeenCalledWith('operation_type', 'rent');
    });

    it('returns formatted results and dynamic suggestions when matching properties exist', async () => {
      const mockProperties = [
        {
          id: 'prop-1',
          title: 'Piso céntrico',
          property_type: 'Apartment',
          price: 150000,
          city: 'Valencia',
          bedrooms: 2,
          bathrooms: 1,
          square_meters: 80,
          status: 'Available',
          image_url: 'https://example.com/p1.jpg',
          images: [],
          amenities: [],
        },
      ];

      const mockChain: any = {};
      mockChain.select = jest.fn().mockReturnValue(mockChain);
      mockChain.ilike = jest.fn().mockReturnValue(mockChain);
      mockChain.eq = jest.fn().mockReturnValue(mockChain);
      mockChain.contains = jest.fn().mockReturnValue(mockChain);
      mockChain.gte = jest.fn().mockReturnValue(mockChain);
      mockChain.lte = jest.fn().mockReturnValue(mockChain);
      mockChain.order = jest.fn().mockReturnValue(mockChain);
      mockChain.limit = jest.fn().mockResolvedValueOnce({ data: mockProperties, error: null });
      (supabase.from as jest.Mock).mockReturnValue(mockChain);

      const result = await querySupabaseDirectly('apartamento en Miami');
      expect(result.data).toHaveLength(1);
      expect(result.answer).toContain('Encontré 1 apartamentos en Miami');
      expect(result.suggestions).toContain('Propiedades más baratas en Miami');
    });
  });
});
