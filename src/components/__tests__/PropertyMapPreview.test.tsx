import React from 'react';
import { render } from '@testing-library/react-native';
import { PropertyMapPreview } from '../PropertyMapPreview';


describe('PropertyMapPreview', () => {
  it('renders read-only map preview container when coordinates are provided', () => {
    const { getByTestId, queryByText } = render(
      <PropertyMapPreview latitude={40.4168} longitude={-3.7038} isApproximate={false} />
    );

    expect(getByTestId('property-map-preview')).toBeTruthy();
    expect(queryByText('Ubicación aproximada')).toBeNull();
  });

  it('renders approximate location badge when isApproximate is true', () => {
    const { getByTestId, getByText } = render(
      <PropertyMapPreview latitude={40.4168} longitude={-3.7038} isApproximate={true} />
    );

    expect(getByTestId('property-map-preview')).toBeTruthy();
    expect(getByText('Ubicación aproximada')).toBeTruthy();
  });

  it('renders nothing when latitude or longitude is missing', () => {
    const { queryByTestId } = render(
      <PropertyMapPreview latitude={undefined} longitude={-3.7038} />
    );

    expect(queryByTestId('property-map-preview')).toBeNull();
  });
});
