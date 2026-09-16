import React from 'react';
import { render } from '@testing-library/react-native';
import { ReactiveSummaryCard } from '../ReactiveSummaryCard';

describe('ReactiveSummaryCard', () => {
  it('returns null when data has no core fields', () => {
    const { toJSON } = render(<ReactiveSummaryCard data={{}} />);
    expect(toJSON()).toBeNull();
  });

  it('renders property attributes in accessible chips when populated', () => {
    const { getByText } = render(
      <ReactiveSummaryCard
        data={{
          property_type: 'Piso',
          neighborhood: 'Chamberí',
          price: 420000,
          bedrooms: 3,
          has_elevator: true,
          elevator_cota_cero: true,
          parking_included: false,
        }}
      />
    );

    expect(getByText('Datos Extraídos por Voz')).toBeTruthy();
    expect(getByText('Piso · Chamberí')).toBeTruthy();
    expect(getByText('420.000 €')).toBeTruthy();
    expect(getByText('3 hab.')).toBeTruthy();
    expect(getByText('Ascensor (Cota cero)')).toBeTruthy();
    expect(getByText('Sin garaje')).toBeTruthy();
  });
});
