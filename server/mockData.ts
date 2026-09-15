import { Property } from './types';

// Helper to generate a deterministic 768-dim normalized vector for testing/mocking
export function generateMockEmbedding(seedText: string): number[] {
  const vector: number[] = new Array(768).fill(0);
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash << 5) - hash + seedText.charCodeAt(i);
    hash |= 0;
  }
  let norm = 0;
  for (let i = 0; i < 768; i++) {
    const val = Math.sin(hash + i);
    vector[i] = val;
    norm += val * val;
  }
  norm = Math.sqrt(norm) || 1;
  return vector.map((v) => Number((v / norm).toFixed(6)));
}

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'b1d6f4b2-0816-4d1a-85b4-78fa2166e4a1',
    title: 'Modern 2-Bed Condo in Downtown Austin',
    property_type: 'Apartment',
    price: 385000,
    bedrooms: 2,
    bathrooms: 2.0,
    square_feet: 1050,
    city: 'Austin',
    address: '401 Colorado St #12B, Austin, TX 78701',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Modern 2-Bed Condo downtown Austin tech apartment'),
    created_at: '2026-09-01T10:00:00Z',
  },
  {
    id: 'a9f2e3c1-7489-46be-9556-91fa1209e512',
    title: 'Sunny South Congress 2-Bed Flat',
    property_type: 'Apartment',
    price: 340000,
    bedrooms: 2,
    bathrooms: 1.5,
    square_feet: 920,
    city: 'Austin',
    address: '1602 S Congress Ave #3, Austin, TX 78704',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Sunny South Congress 2-Bed Flat Austin boutique apartment'),
    created_at: '2026-09-02T11:30:00Z',
  },
  {
    id: 'c3e4f5a6-91b2-48cd-bf78-123456789abc',
    title: 'Luxury Oceanfront Apartment in Miami Beach',
    property_type: 'Apartment',
    price: 890000,
    bedrooms: 2,
    bathrooms: 2.5,
    square_feet: 1450,
    city: 'Miami',
    address: '4701 Collins Ave #1804, Miami Beach, FL 33140',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Luxury Oceanfront Apartment in Miami Beach ocean view'),
    created_at: '2026-09-03T14:15:00Z',
  },
  {
    id: 'd4e5f6a7-02c3-49de-cf89-234567890bcd',
    title: 'Brickell Financial District High-Rise Condo',
    property_type: 'Condo',
    price: 620000,
    bedrooms: 1,
    bathrooms: 1.5,
    square_feet: 850,
    city: 'Miami',
    address: '1421 Brickell Ave #2402, Miami, FL 33131',
    status: 'Pending',
    image_url:
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Brickell Financial District High-Rise Condo Miami skyline'),
    created_at: '2026-09-04T09:20:00Z',
  },
  {
    id: 'e5f6a7b8-13d4-4aef-df90-345678901cde',
    title: 'Spacious Family Craftsman in Denver',
    property_type: 'Single Family',
    price: 675000,
    bedrooms: 4,
    bathrooms: 3.0,
    square_feet: 2600,
    city: 'Denver',
    address: '2840 E 7th Ave, Denver, CO 80206',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Spacious Family Craftsman in Denver yard mountain suburban'),
    created_at: '2026-09-05T16:00:00Z',
  },
  {
    id: 'f6a7b8c9-24e5-4bfa-ef01-456789012def',
    title: 'Modern Mountain-View Townhouse in LoDo',
    property_type: 'Townhouse',
    price: 525000,
    bedrooms: 3,
    bathrooms: 2.5,
    square_feet: 1800,
    city: 'Denver',
    address: '1720 Wynkoop St #4, Denver, CO 80202',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Modern Mountain-View Townhouse in LoDo Denver urban rooftop'),
    created_at: '2026-09-06T12:00:00Z',
  },
  {
    id: 'a7b8c9d0-35f6-4c0b-ff12-567890123ef0',
    title: 'Capitol Hill Contemporary Studio',
    property_type: 'Studio',
    price: 265000,
    bedrooms: 0,
    bathrooms: 1.0,
    square_feet: 480,
    city: 'Seattle',
    address: '1105 E Olive Way #204, Seattle, WA 98122',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1502005229762-ee1b2b81e42a?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1502005229762-ee1b2b81e42a?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Capitol Hill Contemporary Studio Seattle compact starter home'),
    created_at: '2026-09-07T08:30:00Z',
  },
  {
    id: 'b8c9d0e1-4607-4d1c-0023-678901234f01',
    title: 'Ballard Scandinavian-Style Townhouse',
    property_type: 'Townhouse',
    price: 740000,
    bedrooms: 3,
    bathrooms: 3.0,
    square_feet: 1650,
    city: 'Seattle',
    address: '5412 20th Ave NW, Seattle, WA 98107',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Ballard Scandinavian-Style Townhouse Seattle energy efficient'),
    created_at: '2026-09-08T15:45:00Z',
  },
  {
    id: 'c9d0e1f2-5718-4e2d-1134-789012345012',
    title: 'Historic Brooklyn Heights Brownstone',
    property_type: 'Single Family',
    price: 1750000,
    bedrooms: 5,
    bathrooms: 4.5,
    square_feet: 3800,
    city: 'New York',
    address: '142 Columbia Heights, Brooklyn, NY 11201',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Historic Brooklyn Heights Brownstone New York luxury mansion garden'),
    created_at: '2026-09-09T17:00:00Z',
  },
  {
    id: 'd0e1f2a3-6829-4f3e-2245-890123456123',
    title: 'West Village Chic 1-Bed Sanctuary',
    property_type: 'Apartment',
    price: 995000,
    bedrooms: 1,
    bathrooms: 1.0,
    square_feet: 720,
    city: 'New York',
    address: '320 Bleecker St #4A, New York, NY 10014',
    status: 'Sold',
    image_url:
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('West Village Chic 1-Bed Sanctuary New York pre-war boutique'),
    created_at: '2026-09-10T13:20:00Z',
  },
  {
    id: 'e1f2a3b4-7930-404f-3356-901234567234',
    title: 'Zilker Park Mid-Century Home in Austin',
    property_type: 'Single Family',
    price: 849000,
    bedrooms: 3,
    bathrooms: 2.0,
    square_feet: 1950,
    city: 'Austin',
    address: '1904 Barton Hills Dr, Austin, TX 78704',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Zilker Park Mid-Century Home in Austin green trees yard pool'),
    created_at: '2026-09-11T11:00:00Z',
  },
  {
    id: 'f2a3b4c5-8041-415a-4467-012345678345',
    title: 'Downtown Austin Micro-Studio Loft',
    property_type: 'Studio',
    price: 245000,
    bedrooms: 0,
    bathrooms: 1.0,
    square_feet: 420,
    city: 'Austin',
    address: '800 Brazos St #602, Austin, TX 78701',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Downtown Austin Micro-Studio Loft affordable walkable'),
    created_at: '2026-09-12T09:40:00Z',
  },
  {
    id: 'a3b4c5d6-9152-426b-5578-123456789456',
    title: 'Coral Gables Mediterranean Estate',
    property_type: 'Single Family',
    price: 1450000,
    bedrooms: 4,
    bathrooms: 3.5,
    square_feet: 3400,
    city: 'Miami',
    address: '1120 Alhambra Cir, Coral Gables, FL 33134',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Coral Gables Mediterranean Estate Miami palm trees luxury pool'),
    created_at: '2026-09-13T10:15:00Z',
  },
  {
    id: 'b4c5d6e7-0263-437c-6689-234567890567',
    title: 'Queen Anne View Townhouse in Seattle',
    property_type: 'Townhouse',
    price: 885000,
    bedrooms: 3,
    bathrooms: 2.5,
    square_feet: 2100,
    city: 'Seattle',
    address: '1812 5th Ave N, Seattle, WA 98109',
    status: 'Available',
    image_url:
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=80',
    ],
    embedding: generateMockEmbedding('Queen Anne View Townhouse Seattle Space Needle views modern'),
    created_at: '2026-09-14T08:00:00Z',
  },
];
