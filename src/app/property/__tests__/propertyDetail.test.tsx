import React from 'react';
import { Alert, Image } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PropertyDetailScreen from '../[id]';
import * as chatApi from '../../../services/chatApi';

jest.mock('../../../services/chatApi', () => ({
  generatePropertyDescription: jest.fn(),
  transcribeVoiceNote: jest.fn(),
  VOICE_NOTE_MIME_TYPE: 'audio/mp4',
}));

const mockNavigate = jest.fn();
const mockStop = jest.fn();
let mockRecorderStatus = 'idle';

jest.mock('../../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({ state: { status: mockRecorderStatus }, start: jest.fn(), stop: mockStop, cancel: jest.fn() }),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('YmFzZTY0'),
  EncodingType: { Base64: 'base64' },
}));

const mockBack = jest.fn();
let mockParams: {
  id: string;
  title: string;
  price: string;
  city: string;
  address: string;
  bedrooms: string;
  bathrooms: string;
  square_meters: string;
  image_url: string;
  currency?: string;
  property_type?: string;
  operation_type?: string;
  amenities?: string;
  description?: string;
  images?: string;
  lat?: string;
  lng?: string;
  agency_name?: string;
  agent_name?: string;
  preview?: string;
} = {
  id: 'prop-123',
  title: 'Barrio de Salamanca, Madrid',
  price: '485000',
  city: 'Madrid',
  address: 'Calle Claudio Coello',
  bedrooms: '3',
  bathrooms: '2',
  square_meters: '120',
  image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    navigate: mockNavigate,
  }),
  useLocalSearchParams: () => mockParams,
}));

describe('PropertyDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorderStatus = 'idle';
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (chatApi.generatePropertyDescription as jest.Mock).mockResolvedValue({
      description: 'Vivienda totalmente exterior y luminosa, con portero físico y ascensor accesible a cota cero.',
    });
    mockParams = {
      id: 'prop-123',
      title: 'Barrio de Salamanca, Madrid',
      price: '485000',
      city: 'Madrid',
      address: 'Calle Claudio Coello',
      bedrooms: '3',
      bathrooms: '2',
      square_meters: '120',
      image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders hero photo badge, price, and agency badge correctly', async () => {
    const { getByText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    expect(getByText('1 de 8 fotos')).toBeTruthy();
    expect(getByText('$485,000')).toBeTruthy();
    expect(getByText('Sin honorarios de agencia')).toBeTruthy();
    expect(getByText('Barrio de Salamanca, Madrid')).toBeTruthy();
    expect(getByText('Calle Claudio Coello')).toBeTruthy();
  });

  it('never shows the fabricated accessibility or nearby-places sections, for a legacy listing or otherwise', async () => {
    const { queryByText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    expect(queryByText('Características de Accesibilidad y Confort')).toBeNull();
    expect(queryByText('Cercanías a pie')).toBeNull();
  });

  it('renders an AI-generated property description (not hardcoded)', async () => {
    const { getByText } = render(<PropertyDetailScreen />);

    expect(getByText('Descripción de la vivienda')).toBeTruthy();
    expect(chatApi.generatePropertyDescription).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Barrio de Salamanca, Madrid', city: 'Madrid' })
    );
    await waitFor(() => {
      expect(getByText(/Vivienda totalmente exterior y luminosa/)).toBeTruthy();
    });
    expect(getByText(/portero físico y ascensor accesible a cota cero/)).toBeTruthy();
  });

  it('handles contact advisor action from fixed dock', async () => {
    const { getByLabelText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    const contactBtn = getByLabelText('Contactar asesor de Hubik');
    fireEvent.press(contactBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Contactar asesor',
      'Conectando con su asesor personal de Hubik para coordinar una visita accesible.',
      [{ text: 'Entendido' }]
    );
  });

  it('sends a typed question to the main chat, about this property, without a fake confirmation', async () => {
    const { getByPlaceholderText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    const input = getByPlaceholderText('Escriba su consulta aquí...');
    fireEvent.changeText(input, '¿Tiene plaza de garaje accesible?');
    fireEvent(input, 'submitEditing');

    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/',
      params: {
        ask: '¿Tiene plaza de garaje accesible? (sobre «Barrio de Salamanca, Madrid»)',
        askAt: expect.any(String),
      },
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('records a spoken question and sends its transcript to the main chat', async () => {
    mockRecorderStatus = 'recording';
    mockStop.mockResolvedValue({ uri: 'file:///nota.m4a', durationMs: 900 });
    (chatApi.transcribeVoiceNote as jest.Mock).mockResolvedValue('¿Admite mascotas?');
    const { getByLabelText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    fireEvent.press(getByLabelText('Detener grabación de nota de voz'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({
        pathname: '/',
        params: { ask: '¿Admite mascotas? (sobre «Barrio de Salamanca, Madrid»)', askAt: expect.any(String) },
      })
    );
  });

  it('navigates back when tapping header back button', async () => {
    const { getByLabelText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    const backBtn = getByLabelText('Regresar');
    fireEvent.press(backBtn);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders real draft data and hides the fabricated sections when a description param is present', () => {
    mockParams = {
      ...mockParams,
      description: 'Piso luminoso en el centro de Madrid.',
      images: JSON.stringify(['https://storage.example.com/a.jpg', 'https://storage.example.com/b.jpg']),
    };

    const { getByText, queryByText } = render(<PropertyDetailScreen />);

    expect(getByText('Piso luminoso en el centro de Madrid.')).toBeTruthy();
    expect(getByText('1 de 2 fotos')).toBeTruthy();
    expect(queryByText('Características de Accesibilidad y Confort')).toBeNull();
    expect(queryByText('Cercanías a pie')).toBeNull();
    expect(queryByText(/Vivienda totalmente exterior y luminosa/)).toBeNull();
  });

  it('shows the real property type and operation as badges when provided', () => {
    mockParams = {
      ...mockParams,
      description: 'Piso luminoso.',
      property_type: 'Apartment',
      operation_type: 'rent',
    };

    const { getByText } = render(<PropertyDetailScreen />);

    expect(getByText('Piso')).toBeTruthy();
    expect(getByText('En alquiler')).toBeTruthy();
  });

  it('does not show type/operation badges when they were not provided', () => {
    mockParams = { ...mockParams, description: 'Piso luminoso.' };

    const { queryByText } = render(<PropertyDetailScreen />);

    expect(queryByText('En venta')).toBeNull();
    expect(queryByText('En alquiler')).toBeNull();
  });

  it('shows the real amenities written by the agent as chips', () => {
    mockParams = {
      ...mockParams,
      description: 'Piso luminoso.',
      amenities: JSON.stringify(['piscina', 'garaje', 'ascensor']),
    };

    const { getByText } = render(<PropertyDetailScreen />);

    expect(getByText('Comodidades')).toBeTruthy();
    expect(getByText('piscina')).toBeTruthy();
    expect(getByText('garaje')).toBeTruthy();
    expect(getByText('ascensor')).toBeTruthy();
  });

  it('hides the amenities section entirely when there are none', () => {
    mockParams = { ...mockParams, description: 'Piso luminoso.' };

    const { queryByText } = render(<PropertyDetailScreen />);

    expect(queryByText('Comodidades')).toBeNull();
  });

  it('formats the price using the real currency instead of always assuming dollars', () => {
    mockParams = { ...mockParams, description: 'Piso luminoso.', price: '350000', currency: 'EUR' };

    const { getByText } = render(<PropertyDetailScreen />);

    expect(getByText('350.000 €')).toBeTruthy();
  });

  describe('in preview mode', () => {
    const PHOTOS = ['file:///photos/cover.jpg', 'file:///photos/second.jpg'];

    beforeEach(() => {
      mockParams = { ...mockParams, id: 'draft-preview', preview: '1', images: JSON.stringify(PHOTOS) };
    });

    it('says the listing is not published yet', () => {
      const { getByText } = render(<PropertyDetailScreen />);

      expect(getByText('Vista previa: así verán su anuncio. Todavía no está publicado.')).toBeTruthy();
    });

    it('never asks the server to write a description, even when the draft has none', () => {
      const { queryByText } = render(<PropertyDetailScreen />);

      expect(chatApi.generatePropertyDescription).not.toHaveBeenCalled();
      expect(queryByText('Características de Accesibilidad y Confort')).toBeNull();
      expect(queryByText('Cercanías a pie')).toBeNull();
    });

    it('shows the draft description, the cover photo and the photo count', () => {
      mockParams = { ...mockParams, description: 'Piso luminoso en el centro.' };

      const { getByText, UNSAFE_getAllByType } = render(<PropertyDetailScreen />);

      expect(getByText('Piso luminoso en el centro.')).toBeTruthy();
      expect(getByText('1 de 2 fotos')).toBeTruthy();
      const uris = UNSAFE_getAllByType(Image).map((node: any) => node.props.source.uri);
      expect(uris[0]).toBe(PHOTOS[0]);
    });

    it('hides the question bar but keeps navigating back', () => {
      const { queryByPlaceholderText, getByLabelText } = render(<PropertyDetailScreen />);

      expect(queryByPlaceholderText('Escriba su consulta aquí...')).toBeNull();
      fireEvent.press(getByLabelText('Regresar'));
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('photo gallery', () => {
    const PHOTOS = ['https://storage.example.com/a.jpg', 'https://storage.example.com/b.jpg', 'https://storage.example.com/c.jpg'];

    it('opens every photo full screen from the main photo', () => {
      mockParams = { ...mockParams, description: 'Piso luminoso.', images: JSON.stringify(PHOTOS) };
      const { getByLabelText, getByText, getByTestId } = render(<PropertyDetailScreen />);

      fireEvent.press(getByLabelText('Ver todas las fotos (3)'));

      expect(getByText('1 de 3')).toBeTruthy();
      expect(getByTestId('photo-gallery-image-0').props.source).toEqual({ uri: PHOTOS[0] });
    });

    it('goes back to the listing when the viewer is closed', () => {
      mockParams = { ...mockParams, description: 'Piso luminoso.', images: JSON.stringify(PHOTOS) };
      const { getByLabelText, queryByText } = render(<PropertyDetailScreen />);
      fireEvent.press(getByLabelText('Ver todas las fotos (3)'));

      fireEvent.press(getByLabelText('Cerrar las fotos'));

      expect(queryByText('1 de 3')).toBeNull();
    });

    it('opens the preview photos, which are local files', () => {
      const local = ['file:///photos/a.jpg', 'file:///photos/b.jpg'];
      mockParams = { ...mockParams, preview: '1', images: JSON.stringify(local) };
      const { getByLabelText, getByTestId } = render(<PropertyDetailScreen />);

      fireEvent.press(getByLabelText('Ver todas las fotos (2)'));

      expect(getByTestId('photo-gallery-image-1').props.source).toEqual({ uri: local[1] });
    });

    it('offers nothing to open for a listing with stock content and no photos', async () => {
      const { queryByLabelText } = render(<PropertyDetailScreen />);
      await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

      expect(queryByLabelText(/Ver todas las fotos/)).toBeNull();
    });
  });

  it('shows no preview banner when browsing a normal listing', async () => {
    const { queryByText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    expect(queryByText(/Vista previa: así verán/)).toBeNull();
  });

  describe('RFC 023 Property Detail Enrichment & Privacy', () => {
    it('renders the approximate-location copy and map preview when address is absent from params', () => {
      mockParams = {
        ...mockParams,
        address: undefined as any,
        lat: '40.4200',
        lng: '-3.7000',
      };
      const { getAllByText, queryByText, getByTestId } = render(<PropertyDetailScreen />);

      expect(getAllByText('Ubicación aproximada').length).toBeGreaterThanOrEqual(1);
      expect(queryByText('Calle Claudio Coello')).toBeNull();
      expect(getByTestId('property-map-preview')).toBeTruthy();
    });

    it('renders the real address when address is present in params', () => {
      mockParams = {
        ...mockParams,
        address: 'Calle Claudio Coello',
        lat: '40.4168',
        lng: '-3.7038',
      };
      const { getByText, queryByText } = render(<PropertyDetailScreen />);

      expect(getByText('Calle Claudio Coello')).toBeTruthy();
      expect(queryByText('Ubicación aproximada')).toBeNull();
    });

    it('renders stats bar chips for bedrooms, bathrooms, and square meters', () => {
      mockParams = {
        ...mockParams,
        property_type: 'Apartment',
        bedrooms: '4',
        bathrooms: '3',
        square_meters: '180',
      };
      const { getByTestId, getByText } = render(<PropertyDetailScreen />);

      expect(getByTestId('property-stats-bar')).toBeTruthy();
      expect(getByText('4 hab.')).toBeTruthy();
      expect(getByText('3 baños')).toBeTruthy();
      expect(getByText('180 m²')).toBeTruthy();
    });

    it('renders rental price suffix /mes when operation_type is rent', () => {
      mockParams = {
        ...mockParams,
        price: '350000',
        currency: 'EUR',
        operation_type: 'rent',
      };
      const { getByText } = render(<PropertyDetailScreen />);

      expect(getByText('350.000 €/mes')).toBeTruthy();
    });

    it('renders agent/agency card near bottom dock when agency_name is present', () => {
      mockParams = {
        ...mockParams,
        agency_name: 'Inmobiliaria Chamberí',
        agent_name: 'Carlos',
      };
      const { getByTestId, getByText } = render(<PropertyDetailScreen />);

      expect(getByTestId('listing-attribution')).toBeTruthy();
      expect(getByText('Inmobiliaria Chamberí · Carlos')).toBeTruthy();
    });
  });
});

