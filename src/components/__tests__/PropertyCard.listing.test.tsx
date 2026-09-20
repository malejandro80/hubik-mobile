import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyCard } from '../PropertyCard';
import { Property } from '../../types/property';

const baseProperty: Property = {
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
  images: [],
  amenities: [],
};

describe('PropertyCard listing attribution', () => {
  it('shows the agency and the agent who published the listing', () => {
    const { getByText } = render(
      <PropertyCard
        property={{ ...baseProperty, agency_name: 'Casa Norte', agent_name: 'Ana' }}
      />
    );

    expect(getByText('Casa Norte · Ana')).toBeTruthy();
  });

  it('shows only the agency when the listing has no agent (legacy listings)', () => {
    const { getByText } = render(
      <PropertyCard property={{ ...baseProperty, agency_name: 'HUBIK', agent_name: null }} />
    );

    expect(getByText('HUBIK')).toBeTruthy();
  });

  it('shows no attribution line when the listing carries no agency data', () => {
    const { queryByTestId } = render(<PropertyCard property={baseProperty} />);

    expect(queryByTestId('listing-attribution')).toBeNull();
  });
});
