import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyStatsBar } from '../PropertyStatsBar';

describe('PropertyStatsBar', () => {
  it('renders chips for bedrooms, bathrooms, and square meters', () => {
    const { getByText } = render(
      <PropertyStatsBar
        propertyType="Apartment"
        bedrooms="3"
        bathrooms="2"
        squareMeters="120"
      />
    );

    expect(getByText('3 hab.')).toBeTruthy();
    expect(getByText('2 baños')).toBeTruthy();
    expect(getByText('120 m²')).toBeTruthy();
  });

  it('renders with testID and accessibilityLabels', () => {
    const { getByTestId, getByLabelText } = render(
      <PropertyStatsBar
        propertyType="Single Family"
        bedrooms="4"
        bathrooms="3"
        squareMeters="250"
      />
    );

    expect(getByTestId('property-stats-bar')).toBeTruthy();
    expect(getByLabelText('4 hab.')).toBeTruthy();
    expect(getByLabelText('3 baños')).toBeTruthy();
    expect(getByLabelText('250 m²')).toBeTruthy();
  });

  it('handles missing values gracefully with fallback dash', () => {
    const { getByText } = render(
      <PropertyStatsBar
        propertyType="Apartment"
        bedrooms={undefined}
        bathrooms={undefined}
        squareMeters={undefined}
      />
    );

    expect(getByText('— hab.')).toBeTruthy();
    expect(getByText('— baños')).toBeTruthy();
    expect(getByText('— m²')).toBeTruthy();
  });
});
