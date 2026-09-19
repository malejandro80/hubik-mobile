import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PropertyDetailScreen from '../[id]';
import * as chatApi from '../../../services/chatApi';

jest.mock('../../../services/chatApi', () => ({
  generatePropertyDescription: jest.fn(),
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
  description?: string;
  images?: string;
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
  }),
  useLocalSearchParams: () => mockParams,
}));

describe('PropertyDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(getByText(/Calle Claudio Coello · 2ª planta con ascensor cota cero/)).toBeTruthy();
  });

  it('renders all 6 accessibility and comfort features', async () => {
    const { getByText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    expect(getByText('Características de Accesibilidad y Confort')).toBeTruthy();
    expect(getByText('Ascensor directo')).toBeTruthy();
    expect(getByText('Sin escalón en portal')).toBeTruthy();
    expect(getByText('Acceso plano')).toBeTruthy();
    expect(getByText('Pasillos anchos (95cm)')).toBeTruthy();
    expect(getByText('2 Baños adaptados')).toBeTruthy();
    expect(getByText('Ducha llana antideslizante')).toBeTruthy();
    expect(getByText('120 m² soleados')).toBeTruthy();
    expect(getByText('Luz natural de mañana')).toBeTruthy();
    expect(getByText('3 Habitaciones')).toBeTruthy();
    expect(getByText('Armarios empotrados')).toBeTruthy();
    expect(getByText('Calefacción central')).toBeTruthy();
    expect(getByText('Excelente aislamiento')).toBeTruthy();
  });

  it('renders an AI-generated property description (not hardcoded) and walking distance amenities', async () => {
    const { getByText } = render(<PropertyDetailScreen />);

    expect(getByText('Descripción de la vivienda')).toBeTruthy();
    expect(chatApi.generatePropertyDescription).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Barrio de Salamanca, Madrid', city: 'Madrid' })
    );
    await waitFor(() => {
      expect(getByText(/Vivienda totalmente exterior y luminosa/)).toBeTruthy();
    });
    expect(getByText(/portero físico y ascensor accesible a cota cero/)).toBeTruthy();

    expect(getByText('Cercanías a pie')).toBeTruthy();
    expect(getByText('Farmacia 24 horas')).toBeTruthy();
    expect(getByText('A 80 metros')).toBeTruthy();
    expect(getByText('Supermercado tradicional')).toBeTruthy();
    expect(getByText('A 120 metros')).toBeTruthy();
    expect(getByText('Líneas de autobús 1, 9 y 19')).toBeTruthy();
    expect(getByText('A 150 metros')).toBeTruthy();
    expect(getByText('Centro de Salud Lagasca')).toBeTruthy();
    expect(getByText('A 380 metros')).toBeTruthy();
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

  it('handles quick question and mic press from bottom dock', async () => {
    const { getByPlaceholderText, getByLabelText } = render(<PropertyDetailScreen />);
    await waitFor(() => expect(chatApi.generatePropertyDescription).toHaveBeenCalled());

    const micBtn = getByLabelText('Hablar por micrófono');
    fireEvent.press(micBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Micrófono Hubik',
      'Hable con tranquilidad para consultar sobre esta vivienda.'
    );

    const input = getByPlaceholderText('Escriba su consulta aquí...');
    fireEvent.changeText(input, '¿Tiene plaza de garaje accesible?');
    fireEvent(input, 'submitEditing');

    expect(Alert.alert).toHaveBeenCalledWith(
      'Consulta enviada',
      'Su pregunta: "¿Tiene plaza de garaje accesible?" ha sido enviada al asistente.'
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
});
