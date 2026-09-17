import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../index';
import * as chatApi from '../../services/chatApi';

jest.mock('../../services/chatApi', () => ({
  sendChatQuery: jest.fn(),
  sendChatQueryAudio: jest.fn(),
  fetchDynamicSuggestions: jest.fn().mockResolvedValue([
    'Austin 2-bed under $400k',
    'Luxury condos in Miami',
  ]),
  intakeProperty: jest.fn(),
  intakePropertyAudio: jest.fn(),
  publishProperty: jest.fn(),
  generatePropertyDescription: jest.fn(),
  generatePropertyTitle: jest.fn(() => 'Piso en venta en Madrid'),
  VOICE_NOTE_MIME_TYPE: 'audio/mp4',
}));

jest.mock('../../services/propertyImages', () => ({
  uploadPropertyImages: jest.fn(),
  MAX_PROPERTY_IMAGES: 10,
}));

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64-audio-data'),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64-audio-data'),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-location', () => ({
  reverseGeocodeAsync: jest.fn().mockResolvedValue([{ street: 'Calle Mayor 12', city: 'Madrid' }]),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View };
});

const mockRecorderState: { status: 'idle' | 'recording' | 'processing' } = { status: 'idle' };
const mockRecorderStart = jest.fn(async () => {
  mockRecorderState.status = 'recording';
});
const mockRecorderStop = jest.fn(async () => {
  mockRecorderState.status = 'idle';
  return { uri: 'file://note.m4a', durationMs: 3000 };
});

jest.mock('../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    state: mockRecorderState,
    start: mockRecorderStart,
    stop: mockRecorderStop,
    cancel: jest.fn(),
  }),
}));

describe('HomeScreen (Chat UI)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorderState.status = 'idle';
  });

  it('renders header, initial welcome message, and clean input field', () => {
    const { getByText, getByPlaceholderText, queryByLabelText } = render(
      <HomeScreen />
    );

    expect(getByText('Hubik Real Estate AI')).toBeTruthy();
    expect(getByText('Buenos días, Don Carlos.')).toBeTruthy();
    expect(
      getByText(/¿En qué puedo ayudarle hoy con sus propiedades/)
    ).toBeTruthy();
    expect(getByText('botón verde del micrófono')).toBeTruthy();
    expect(getByPlaceholderText('Escriba su consulta aquí...')).toBeTruthy();

    // Verify paperclip and camera icons are removed
    expect(queryByLabelText('Adjuntar archivo o documento')).toBeNull();
    expect(queryByLabelText('Tomar foto o imagen')).toBeNull();

    // Verify back button is hidden on main chat screen
    expect(queryByLabelText('Regresar')).toBeNull();
  });

  it('sends query when typing and tapping send button', async () => {
    const mockProperty = {
      id: 'prop-1',
      title: 'Modern Austin Apartment',
      property_type: 'Apartment',
      price: 375000,
      bedrooms: 2,
      bathrooms: 2,
      square_meters: 93,
      city: 'Austin',
      address: '200 Congress Ave',
      status: 'Available',
      image_url: 'https://example.com/photo.jpg',
      images: [],
    };

    (chatApi.sendChatQuery as jest.Mock).mockResolvedValueOnce({
      answer: 'Found 1 property in Austin',
      data: [mockProperty],
    });

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    const input = getByPlaceholderText('Escriba su consulta aquí...');
    const sendButton = getByText('Enviar');

    fireEvent.changeText(input, '2-bed in Austin');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(chatApi.sendChatQuery).toHaveBeenCalledWith('2-bed in Austin');
    });

    await waitFor(() => {
      expect(getByText('Found 1 property in Austin')).toBeTruthy();
      expect(getByText('Modern Austin Apartment')).toBeTruthy();
    });
  });

  it('displays helpful error message when API call fails', async () => {
    (chatApi.sendChatQuery as jest.Mock).mockRejectedValueOnce(
      new Error('Network request failed')
    );

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    const input = getByPlaceholderText('Escriba su consulta aquí...');
    const sendButton = getByText('Enviar');

    fireEvent.changeText(input, 'Any houses in Denver');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(getByText(/No se pudo conectar con el servicio de IA/)).toBeTruthy();
    });
  });

  it('opens and interacts with burger menu when tapping header menu button', () => {
    const { getByLabelText, getByText } = render(<HomeScreen />);

    const menuButton = getByLabelText('Menú de opciones');
    fireEvent.press(menuButton);

    // Verify BurgerMenu content is now visible
    expect(getByText('Buscar Propiedades')).toBeTruthy();
    expect(getByText('Reiniciar Chat')).toBeTruthy();
    expect(getByText('Propiedades Guardadas')).toBeTruthy();

    // Tap to restart chat
    const restartItem = getByText('Reiniciar Chat');
    fireEvent.press(restartItem);

    // Initial greeting remains
    expect(getByText('Buenos días, Don Carlos.')).toBeTruthy();
  });

  it('records a voice note and renders the transcript followed by the search response', async () => {
    (chatApi.sendChatQueryAudio as jest.Mock).mockResolvedValueOnce({
      answer: 'Encontré 1 apartamento en Austin',
      data: [],
      transcript: 'apartamentos en Austin',
    });

    const { getByLabelText, getByText } = render(<HomeScreen />);
    const micButton = getByLabelText('Hablar por micrófono');

    fireEvent.press(micButton);
    await waitFor(() => expect(mockRecorderStart).toHaveBeenCalledTimes(1));

    fireEvent.press(micButton);
    await waitFor(() => expect(mockRecorderStop).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(chatApi.sendChatQueryAudio).toHaveBeenCalledWith({
        data: 'base64-audio-data',
        mimeType: 'audio/mp4',
      });
      expect(getByText('apartamentos en Austin')).toBeTruthy();
      expect(getByText('Encontré 1 apartamento en Austin')).toBeTruthy();
    });
  });

  it('shows an alert and sends nothing when the microphone permission is denied', async () => {
    mockRecorderStart.mockRejectedValueOnce(new Error('MIC_PERMISSION_DENIED'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByLabelText } = render(<HomeScreen />);
    fireEvent.press(getByLabelText('Hablar por micrófono'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Micrófono no disponible',
        expect.any(String),
        expect.any(Array)
      );
    });
    expect(chatApi.sendChatQueryAudio).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});

describe('HomeScreen (Chat-Guided Property Registration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorderState.status = 'idle';
  });

  const completeDraft = {
    operation_type: 'sale',
    property_type: 'Apartment',
    price: 420000,
    bedrooms: 3,
    bathrooms: 2,
    square_meters: 90,
    city: 'Madrid',
    address: 'Calle Mayor 12',
  };

  it('starts the guided flow when the user types /agregar-propiedad', async () => {
    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    const input = getByPlaceholderText('Escriba su consulta aquí...');

    fireEvent.changeText(input, '/agregar-propiedad');
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(getByText(/indíqueme la referencia catastral/)).toBeTruthy();
    });
    expect(chatApi.sendChatQuery).not.toHaveBeenCalled();
  });

  it('sends /agregar-propiedad automatically when tapping "Registrar Vivienda" in the sidebar', async () => {
    const { getByLabelText, getByText } = render(<HomeScreen />);

    fireEvent.press(getByLabelText('Menú de opciones'));
    fireEvent.press(getByText('Registrar Vivienda'));

    await waitFor(() => {
      expect(getByText('/agregar-propiedad')).toBeTruthy();
      expect(getByText(/indíqueme la referencia catastral/)).toBeTruthy();
    });
  });

  it('lists missing required fields after a partial description, without writing to Supabase', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: { operation_type: 'sale', property_type: 'Apartment' },
      missing_fields: ['price', 'bathrooms', 'square_meters', 'city', 'address'],
      assistant_message: 'Me falta: precio, baños, metros cuadrados, ciudad y dirección.',
      ready_to_confirm: false,
    });

    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    const input = getByPlaceholderText('Escriba su consulta aquí...');

    fireEvent.changeText(input, '/agregar-propiedad');
    fireEvent.press(getByText('Enviar'));
    await waitFor(() => getByText(/referencia catastral/));

    fireEvent.changeText(input, 'Quiero vender mi piso');
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(getByText(/Me falta: precio, baños, metros cuadrados, ciudad y dirección/)).toBeTruthy();
    });
    expect(chatApi.publishProperty).not.toHaveBeenCalled();
  });

  it('completes the flow: photos, location, AI description, then publishes on "Confirmar y publicar"', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      data: completeDraft,
      missing_fields: [],
      assistant_message: '¡Perfecto! Ya tengo todos los datos necesarios. Aquí tiene el resumen para confirmar.',
      ready_to_confirm: true,
    });
    (chatApi.generatePropertyDescription as jest.Mock).mockResolvedValueOnce({
      description: 'Piso luminoso en el centro de Madrid.',
    });
    (chatApi.publishProperty as jest.Mock).mockResolvedValueOnce({
      id: 'new-prop-1',
      title: 'Piso en venta en Madrid',
      property_type: 'Apartment',
      price: 420000,
      bedrooms: 3,
      bathrooms: 2,
      square_meters: 90,
      city: 'Madrid',
      address: 'Calle Mayor 12',
      status: 'Available',
      image_url: '',
      images: [],
    });

    const { getByPlaceholderText, getByText, getByLabelText } = render(<HomeScreen />);
    const input = getByPlaceholderText('Escriba su consulta aquí...');

    fireEvent.changeText(input, '/agregar-propiedad');
    fireEvent.press(getByText('Enviar'));
    await waitFor(() => getByText(/referencia catastral/));

    fireEvent.changeText(
      input,
      'Vendo mi piso en Madrid, calle Mayor 12, 3 habitaciones, 2 baños, 90 metros cuadrados, por 420.000 euros'
    );
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(getByLabelText('Search for Continuar sin fotos')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Search for Continuar sin fotos'));

    await waitFor(() => {
      expect(getByLabelText('Search for Fijar ubicación')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Search for Fijar ubicación'));

    await waitFor(() => {
      expect(getByText(/Confirmar ubicación/)).toBeTruthy();
    });
    fireEvent.press(getByText(/Confirmar ubicación/));

    await waitFor(() => {
      expect(chatApi.generatePropertyDescription).toHaveBeenCalled();
      expect(getByText(/Confirmar y publicar/)).toBeTruthy();
      expect(getByText(/Corregir algo/)).toBeTruthy();
    });

    expect(chatApi.publishProperty).not.toHaveBeenCalled();

    fireEvent.press(getByText(/Confirmar y publicar/));

    await waitFor(() => {
      expect(chatApi.publishProperty).toHaveBeenCalledWith(
        expect.objectContaining({
          ...completeDraft,
          description: 'Piso luminoso en el centro de Madrid.',
        })
      );
      expect(getByText(/Publiqué "Piso en venta en Madrid"/)).toBeTruthy();
    });
  });

  it('cancels the flow and returns to normal search chat', async () => {
    const { getByPlaceholderText, getByText } = render(<HomeScreen />);
    const input = getByPlaceholderText('Escriba su consulta aquí...');

    fireEvent.changeText(input, '/agregar-propiedad');
    fireEvent.press(getByText('Enviar'));
    await waitFor(() => getByText(/referencia catastral/));

    fireEvent.changeText(input, 'cancelar registro');
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(getByText(/cancelé el registro/)).toBeTruthy();
    });

    (chatApi.sendChatQuery as jest.Mock).mockResolvedValueOnce({
      answer: 'Found 1 property in Austin',
      data: [],
    });
    fireEvent.changeText(input, '2-bed in Austin');
    fireEvent.press(getByText('Enviar'));

    await waitFor(() => {
      expect(chatApi.sendChatQuery).toHaveBeenCalledWith('2-bed in Austin');
    });
  });
});
