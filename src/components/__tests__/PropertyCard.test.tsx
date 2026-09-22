import React from 'react';
import { Share } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { PropertyCard } from '../PropertyCard';
import { Property } from '../../types/property';

let mockShareBase = '';

jest.mock('../../constants/share', () => ({
  get SHARE_BASE_URL() {
    return mockShareBase;
  },
  SHARE_PAGE_PATH: '/p',
  SHARE_QUERY_PARAM: 'id',
}));

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
  amenities: [],
};

describe('PropertyCard Component', () => {
  it('renders property title, price, and location correctly', () => {
    const { getByText } = render(<PropertyCard property={mockProperty} />);

    expect(getByText('Luxury Downtown Loft')).toBeTruthy();
    expect(getByText('$450,000')).toBeTruthy();
    expect(getByText(/Austin/)).toBeTruthy();
  });

  it('renders specs for bedrooms, bathrooms, and square meters', () => {
    const { getByText, getByLabelText } = render(
      <PropertyCard property={mockProperty} />
    );

    expect(getByText(/2 hab\./)).toBeTruthy();
    expect(getByText(/2 baños/)).toBeTruthy();
    expect(getByText(/102 m²/)).toBeTruthy();
    expect(getByText('Piso')).toBeTruthy();
    expect(getByLabelText('102 metros cuadrados')).toBeTruthy();
  });

  it('renders the real property_type label, not a hardcoded one', () => {
    const { getByText } = render(
      <PropertyCard property={{ ...mockProperty, property_type: 'Single Family' }} />
    );

    expect(getByText('Casa')).toBeTruthy();
  });

  it('renders property status badge in Spanish', () => {
    const { getByText } = render(<PropertyCard property={mockProperty} />);

    expect(getByText('Disponible')).toBeTruthy();
  });

  it('renders action buttons and triggers onPress on click', () => {
    const handlePress = jest.fn();
    const { getByText } = render(
      <PropertyCard property={mockProperty} onPress={handlePress} />
    );

    expect(getByText('Ver detalle')).toBeTruthy();
    expect(getByText('Compartir')).toBeTruthy();

    const detailBtn = getByText('Ver detalle');
    fireEvent.press(detailBtn);
    expect(handlePress).toHaveBeenCalledWith(mockProperty);
  });
});

describe('PropertyCard share', () => {
  const LISTING_ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';
  const baseText =
    'Mira esta propiedad en Hubik: Luxury Downtown Loft por $450,000 en Austin.\nDirección: 100 Congress Ave';

  beforeEach(() => {
    mockShareBase = '';
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares the link alone when a share base URL is configured, so Copy gives just the URL', () => {
    mockShareBase = 'https://hubik.example.app';
    const { getByLabelText } = render(<PropertyCard property={{ ...mockProperty, id: LISTING_ID }} />);

    fireEvent.press(getByLabelText('Compartir Luxury Downtown Loft'));

    expect(Share.share).toHaveBeenCalledWith({
      title: 'Luxury Downtown Loft',
      message: 'https://hubik.example.app/p/luxury-downtown-loft-3f2b1c9e',
    });
  });

  it('sends exactly the plain text when no share base URL is configured', () => {
    const { getByLabelText } = render(<PropertyCard property={{ ...mockProperty, id: LISTING_ID }} />);

    fireEvent.press(getByLabelText('Compartir Luxury Downtown Loft'));

    expect(Share.share).toHaveBeenCalledWith({ title: 'Luxury Downtown Loft', message: baseText });
  });

  it('sends no link for an id that is not a real listing id', () => {
    mockShareBase = 'https://hubik.example.app';
    const { getByLabelText } = render(<PropertyCard property={mockProperty} />);

    fireEvent.press(getByLabelText('Compartir Luxury Downtown Loft'));

    expect(Share.share).toHaveBeenCalledWith({ title: 'Luxury Downtown Loft', message: baseText });
  });
});

