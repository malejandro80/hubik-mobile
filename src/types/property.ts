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
  similarity?: number;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  properties?: Property[];
  timestamp: string;
}
