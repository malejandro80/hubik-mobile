import { z } from 'zod';

export type PropertyType =
  | 'Apartment'
  | 'Single Family'
  | 'Townhouse'
  | 'Studio'
  | 'Condo';

export type PropertyStatus = 'Available' | 'Pending' | 'Sold';

export interface Property {
  id: string;
  title: string;
  property_type: PropertyType;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  city: string;
  address: string;
  status: PropertyStatus;
  image_url: string;
  images: string[];
  embedding?: number[];
  similarity?: number;
  created_at?: string;
}

export const PropertyFilterSchema = z.object({
  city: z.string().optional(),
  property_type: z
    .enum(['Apartment', 'Single Family', 'Townhouse', 'Studio', 'Condo'])
    .optional(),
  min_price: z.number().nonnegative().optional(),
  max_price: z.number().positive().optional(),
  min_bedrooms: z.number().int().nonnegative().optional(),
  max_bedrooms: z.number().int().positive().optional(),
  min_bathrooms: z.number().nonnegative().optional(),
  min_square_feet: z.number().int().positive().optional(),
  max_square_feet: z.number().int().positive().optional(),
  status: z.enum(['Available', 'Pending', 'Sold']).optional(),
  sort_by: z
    .enum([
      'price_asc',
      'price_desc',
      'bedrooms_desc',
      'square_feet_desc',
      'newest',
    ])
    .optional(),
  limit: z.number().int().positive().max(50).default(10),
});

export type PropertyFilterParams = z.infer<typeof PropertyFilterSchema>;

export interface ChatQueryRequest {
  message: string;
}

export interface ChatQueryResponse {
  answer: string;
  data: Property[];
  applied_filters?: PropertyFilterParams;
}
