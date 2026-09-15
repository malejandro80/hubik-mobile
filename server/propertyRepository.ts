import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { MOCK_PROPERTIES } from './mockData';
import { Property, PropertyFilterParams, PropertyFilterSchema } from './types';

dotenv.config();

function computeCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export class PropertyRepository {
  private supabase: SupabaseClient | null = null;
  private useFallbackOnly: boolean;

  constructor(options?: { useFallbackOnly?: boolean }) {
    this.useFallbackOnly = options?.useFallbackOnly ?? false;

    if (!this.useFallbackOnly) {
      const url =
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        'https://wbzfeqzvwfglirwlpzpy.supabase.co';
      const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.EXPO_PUBLIC_SUPABASE_KEY ||
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        '';

      if (url && key) {
        this.supabase = createClient(url, key);
      }
    }
  }

  /**
   * Deterministic, parameterized filtering against Supabase or in-memory fallback.
   * Guarantees SELECT-only operations with validated parameters.
   */
  async filterProperties(rawFilters: Partial<PropertyFilterParams>): Promise<Property[]> {
    const filters = PropertyFilterSchema.parse(rawFilters);

    if (this.supabase && !this.useFallbackOnly) {
      try {
        let query = this.supabase
          .from('properties')
          .select(
            'id, title, property_type, price, bedrooms, bathrooms, square_feet, city, address, status, image_url, images, created_at'
          );

        if (filters.city) {
          query = query.ilike('city', `%${filters.city}%`);
        }
        if (filters.property_type) {
          query = query.eq('property_type', filters.property_type);
        }
        if (filters.min_price !== undefined) {
          query = query.gte('price', filters.min_price);
        }
        if (filters.max_price !== undefined) {
          query = query.lte('price', filters.max_price);
        }
        if (filters.min_bedrooms !== undefined) {
          query = query.gte('bedrooms', filters.min_bedrooms);
        }
        if (filters.max_bedrooms !== undefined) {
          query = query.lte('bedrooms', filters.max_bedrooms);
        }
        if (filters.min_bathrooms !== undefined) {
          query = query.gte('bathrooms', filters.min_bathrooms);
        }
        if (filters.min_square_feet !== undefined) {
          query = query.gte('square_feet', filters.min_square_feet);
        }
        if (filters.max_square_feet !== undefined) {
          query = query.lte('square_feet', filters.max_square_feet);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }

        // Sorting
        switch (filters.sort_by) {
          case 'price_asc':
            query = query.order('price', { ascending: true });
            break;
          case 'price_desc':
            query = query.order('price', { ascending: false });
            break;
          case 'bedrooms_desc':
            query = query.order('bedrooms', { ascending: false });
            break;
          case 'square_feet_desc':
            query = query.order('square_feet', { ascending: false });
            break;
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
          default:
            query = query.order('price', { ascending: true });
            break;
        }

        query = query.limit(filters.limit);

        const { data, error } = await query;
        if (error) {
          console.warn('⚠️ [PropertyRepository] Supabase query error:', error.message);
          throw error;
        }
        return (data || []) as Property[];
      } catch (err) {
        console.warn('⚠️ [PropertyRepository] Supabase query fallback:', err);
      }
    }

    // In-memory fallback dataset filtering
    return this.filterInMemory(filters);
  }

  /**
   * Semantic vector search using pgvector match_properties RPC or local cosine similarity.
   */
  async semanticSearchProperties(
    embedding: number[],
    limit = 10,
    threshold = 0.0
  ): Promise<Property[]> {
    if (this.supabase && !this.useFallbackOnly) {
      try {
        const { data, error } = await this.supabase.rpc('match_properties', {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: limit,
        });

        if (error) {
          console.warn('⚠️ [PropertyRepository] pgvector RPC error:', error.message);
          throw error;
        }
        return (data || []) as Property[];
      } catch (err) {
        console.warn('⚠️ [PropertyRepository] pgvector RPC fallback:', err);
      }
    }

    // Local semantic similarity fallback
    return MOCK_PROPERTIES.map((prop) => {
      const sim = prop.embedding
        ? computeCosineSimilarity(embedding, prop.embedding)
        : 0;
      return { ...prop, similarity: Number(sim.toFixed(4)) };
    })
      .filter((p) => (p.similarity ?? 0) >= threshold)
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, limit);
  }

  private filterInMemory(filters: PropertyFilterParams): Property[] {
    let results = [...MOCK_PROPERTIES];

    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      results = results.filter((p) => p.city.toLowerCase().includes(cityLower));
    }
    if (filters.property_type) {
      results = results.filter((p) => p.property_type === filters.property_type);
    }
    if (filters.min_price !== undefined) {
      results = results.filter((p) => p.price >= (filters.min_price as number));
    }
    if (filters.max_price !== undefined) {
      results = results.filter((p) => p.price <= (filters.max_price as number));
    }
    if (filters.min_bedrooms !== undefined) {
      results = results.filter((p) => p.bedrooms >= (filters.min_bedrooms as number));
    }
    if (filters.max_bedrooms !== undefined) {
      results = results.filter((p) => p.bedrooms <= (filters.max_bedrooms as number));
    }
    if (filters.min_bathrooms !== undefined) {
      results = results.filter((p) => p.bathrooms >= (filters.min_bathrooms as number));
    }
    if (filters.min_square_feet !== undefined) {
      results = results.filter(
        (p) => p.square_feet >= (filters.min_square_feet as number)
      );
    }
    if (filters.max_square_feet !== undefined) {
      results = results.filter(
        (p) => p.square_feet <= (filters.max_square_feet as number)
      );
    }
    if (filters.status) {
      results = results.filter((p) => p.status === filters.status);
    }

    switch (filters.sort_by) {
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'bedrooms_desc':
        results.sort((a, b) => b.bedrooms - a.bedrooms);
        break;
      case 'square_feet_desc':
        results.sort((a, b) => b.square_feet - a.square_feet);
        break;
      case 'newest':
        results.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );
        break;
      default:
        results.sort((a, b) => a.price - b.price);
        break;
    }

    return results.slice(0, filters.limit);
  }
}
