import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyCard } from '../PropertyCard';
import { Property } from '../../types/property';

const mockProperty: Property = {
  id: 'test-1',
  title: 'Luxury Downtown Loft',
  property_type: 'Apartment',
  price: 450000,
  bedrooms: 2,
  bathrooms: 2,
  square_meters: 102,
  city: 'Austin',
  address: '100 Congress Ave',
  status: 'Available',
  image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
  images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00'],
};

describe('PropertyCard Component', () => {
  it('renders property title, price, and location correctly', () => {
    const { getByText } = render(<PropertyCard property={mockProperty} />);

    expect(getByText('Luxury Downtown Loft')).toBeTruthy();
    expect(getByText('$450,000')).toBeTruthy();
    expect(getByText(/Austin/)).toBeTruthy();
  });

  it('renders specs for bedrooms, bathrooms, and square meters', () => {
    const { getByText } = render(<PropertyCard property={mockProperty} />);

    expect(getByText(/2 Beds/)).toBeTruthy();
    expect(getByText(/2 Baths/)).toBeTruthy();
    expect(getByText(/102 m²/)).toBeTruthy();
  });

  it('renders property status and type badges', () => {
    const { getByText } = render(<PropertyCard property={mockProperty} />);

    expect(getByText('Available')).toBeTruthy();
    expect(getByText('Apartment')).toBeTruthy();
  });
});
