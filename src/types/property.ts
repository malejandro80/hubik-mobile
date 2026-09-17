export type PropertyType =
  | 'Apartment'
  | 'Single Family'
  | 'Townhouse'
  | 'Studio'
  | 'Condo';

export type PropertyStatus = 'Available' | 'Pending' | 'Sold';

export type OperationType = 'sale' | 'rent';

export interface Property {
  id: string;
  catastro?: string;
  title: string;
  property_type: PropertyType;
  operation_type?: OperationType;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  city: string;
  address: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  status: PropertyStatus;
  image_url: string;
  images: string[];
  similarity?: number;
  embedding?: number[];
  created_at?: string;
}

export interface PropertyDraft {
  catastro?: string;
  title?: string;
  property_type?: PropertyType;
  operation_type?: OperationType;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  city?: string;
  address?: string;
  images?: string[];
  latitude?: number;
  longitude?: number;
  description?: string;
}

export const REQUIRED_PROPERTY_DRAFT_FIELDS: (keyof PropertyDraft)[] = [
  'catastro',
  'property_type',
  'operation_type',
  'price',
  'bedrooms',
  'bathrooms',
  'square_meters',
  'city',
  'address',
];

type RequiredDraftField = 'catastro' | 'title' | 'property_type' | 'operation_type' | 'price' | 'bedrooms' | 'bathrooms' | 'square_meters' | 'city' | 'address';

export const PROPERTY_DRAFT_FIELD_LABELS: Record<RequiredDraftField, string> = {
  catastro: 'referencia catastral',
  title: 'título',
  property_type: 'tipo de propiedad',
  operation_type: 'si es venta o alquiler',
  price: 'precio',
  bedrooms: 'habitaciones',
  bathrooms: 'baños',
  square_meters: 'metros cuadrados',
  city: 'ciudad',
  address: 'dirección',
};

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  title?: string;
  text: string;
  properties?: Property[];
  timestamp: string;
}
