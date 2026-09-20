import React from 'react';
import { render } from '@testing-library/react-native';
import PropertyDetailScreen from '../[id]';

jest.mock('../../../services/chatApi', () => ({
  generatePropertyDescription: jest.fn().mockResolvedValue({ description: 'Vivienda luminosa.' }),
}));

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const baseParams = {
  id: 'prop-123',
  title: 'Piso en Madrid',
  price: '485000',
  city: 'Madrid',
  address: 'Calle Claudio Coello',
  bedrooms: '3',
  bathrooms: '2',
  square_meters: '120',
  image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
};

describe('PropertyDetailScreen attribution', () => {
  it('shows the agency and agent when they are passed as params', () => {
    mockParams = { ...baseParams, agency_name: 'Casa Norte', agent_name: 'Ana' };
    const { getByText } = render(<PropertyDetailScreen />);

    expect(getByText('Casa Norte · Ana')).toBeTruthy();
  });

  it('shows no attribution when the params are absent', () => {
    mockParams = baseParams;
    const { queryByTestId } = render(<PropertyDetailScreen />);

    expect(queryByTestId('listing-attribution')).toBeNull();
  });
});
