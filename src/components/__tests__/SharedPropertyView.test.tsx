import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SharedPropertyView } from '../SharedPropertyView';
import { Property } from '../../types/property';

const PROPERTY: Property = {
  id: '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55',
  title: 'Piso luminoso en Madrid',
  property_type: 'Apartment',
  price: 420000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Madrid',
  address: 'Calle Mayor 12',
  description: 'Un piso reformado junto al parque.',
  status: 'Available',
  image_url: 'https://cdn.example.com/cover.jpg',
  images: ['https://cdn.example.com/cover.jpg', 'https://cdn.example.com/second.jpg'],
  amenities: [],
  agency_name: 'Casa Norte',
  agent_name: 'Ana Pérez',
};

describe('SharedPropertyView', () => {
  it('shows the listing information', () => {
    const { getByText } = render(<SharedPropertyView property={PROPERTY} />);

    expect(getByText('Piso luminoso en Madrid')).toBeTruthy();
    expect(getByText('$420,000')).toBeTruthy();
    expect(getByText('Calle Mayor 12, Madrid')).toBeTruthy();
    expect(getByText('3 hab.')).toBeTruthy();
    expect(getByText('2 baños')).toBeTruthy();
    expect(getByText('90 m²')).toBeTruthy();
    expect(getByText('Descripción')).toBeTruthy();
    expect(getByText('Un piso reformado junto al parque.')).toBeTruthy();
  });

  it('shows the cover photo and how many photos there are', () => {
    const { getByTestId, getByText } = render(<SharedPropertyView property={PROPERTY} />);

    expect(getByTestId('shared-hero').props.source).toEqual({ uri: 'https://cdn.example.com/cover.jpg' });
    expect(getByText('1 de 2 fotos')).toBeTruthy();
  });

  it('falls back to image_url and says so when there are no photos at all', () => {
    const withUrlOnly = { ...PROPERTY, images: [] };
    const first = render(<SharedPropertyView property={withUrlOnly} />);
    expect(first.getByTestId('shared-hero').props.source).toEqual({ uri: 'https://cdn.example.com/cover.jpg' });
    first.unmount();

    const none = render(<SharedPropertyView property={{ ...PROPERTY, images: [], image_url: '' }} />);
    expect(none.queryByTestId('shared-hero')).toBeNull();
    expect(none.getByText('Sin fotos')).toBeTruthy();
  });

  it('names the agency and the agent', () => {
    const { getByText } = render(<SharedPropertyView property={PROPERTY} />);

    expect(getByText(/Casa Norte/)).toBeTruthy();
    expect(getByText(/Ana Pérez/)).toBeTruthy();
  });

  it('copes with a missing description, agent and agency', () => {
    const bare = { ...PROPERTY, description: undefined, agent_name: undefined, agency_name: undefined };
    const { queryByText, getByText } = render(<SharedPropertyView property={bare} />);

    expect(queryByText('Descripción')).toBeNull();
    expect(queryByText(/Casa Norte/)).toBeNull();
    expect(getByText('Piso luminoso en Madrid')).toBeTruthy();
  });

  it('uses the singular for one bathroom', () => {
    const { getByText } = render(<SharedPropertyView property={{ ...PROPERTY, bathrooms: 1 }} />);

    expect(getByText('1 baño')).toBeTruthy();
  });

  it('renders text from the listing as plain text, never as markup', () => {
    const hostile = { ...PROPERTY, title: '<script>alert(1)</script>', description: '<img src=x onerror=alert(1)>' };
    const { getByText } = render(<SharedPropertyView property={hostile} />);

    expect(getByText('<script>alert(1)</script>')).toBeTruthy();
    expect(getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
  });

  describe('photo gallery', () => {
    it('opens every photo full screen from the main photo', () => {
      const { getByLabelText, getByText, queryByText } = render(<SharedPropertyView property={PROPERTY} />);
      expect(queryByText('1 de 2')).toBeNull();

      fireEvent.press(getByLabelText('Ver todas las fotos (2)'));

      expect(getByText('1 de 2')).toBeTruthy();
      expect(getByLabelText('Ir a la foto 2 de 2')).toBeTruthy();
    });

    it('closes the viewer and returns to the listing', () => {
      const { getByLabelText, queryByText } = render(<SharedPropertyView property={PROPERTY} />);
      fireEvent.press(getByLabelText('Ver todas las fotos (2)'));

      fireEvent.press(getByLabelText('Cerrar las fotos'));

      expect(queryByText('1 de 2')).toBeNull();
    });

    it('opens the only photo when the listing has just an image_url', () => {
      const { getByLabelText, getByTestId } = render(<SharedPropertyView property={{ ...PROPERTY, images: [] }} />);

      fireEvent.press(getByLabelText('Ver todas las fotos (1)'));

      expect(getByTestId('photo-gallery-image-0').props.source).toEqual({ uri: 'https://cdn.example.com/cover.jpg' });
    });

    it('has nothing to open when there are no photos', () => {
      const { queryByLabelText } = render(<SharedPropertyView property={{ ...PROPERTY, images: [], image_url: '' }} />);

      expect(queryByLabelText(/Ver todas las fotos/)).toBeNull();
    });
  });
});

