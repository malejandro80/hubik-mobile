import React from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../index';
import { ConversationProvider } from '../../hooks/ConversationProvider';
import { useConversation } from '../../hooks/useConversation';
import * as chatApi from '../../services/chatApi';
import * as propertyImages from '../../services/propertyImages';
import * as ImagePicker from 'expo-image-picker';

const mockSignedOutAuth = {
  status: 'signedOut',
  profile: null,
  capabilities: { canRegisterProperty: false, canCreateAgency: false, canViewAgencyListings: false },
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
};

const mockAgentAuth = {
  ...mockSignedOutAuth,
  status: 'signedIn',
  profile: { userId: 'agent-1', role: 'agent', agencyId: 'agency-1', displayName: 'Ana' },
  capabilities: { canRegisterProperty: true, canCreateAgency: false, canViewAgencyListings: false },
};

let mockAuth: Record<string, unknown> = mockSignedOutAuth;

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

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
  getMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
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
    mockAuth = mockSignedOutAuth;
    mockRecorderState.status = 'idle';
  });

  it('renders header, the start screen, and clean input field', () => {
    const { getByText, getByPlaceholderText, queryByLabelText } = render(
      <HomeScreen />
    );

    expect(getByText('Hubik Real Estate AI')).toBeTruthy();
    expect(getByText('Bienvenido a Hubik')).toBeTruthy();
    expect(getByText('Empezar')).toBeTruthy();
    expect(getByText('Toque el micrófono para hablar')).toBeTruthy();
    expect(getByPlaceholderText('Escriba su consulta aquí...')).toBeTruthy();

    expect(queryByLabelText('Adjuntar archivo o documento')).toBeNull();
    expect(queryByLabelText('Tomar foto o imagen')).toBeNull();

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
    const { getByLabelText, getByText, queryByText } = render(<HomeScreen />);

    const menuButton = getByLabelText('Menú de opciones');
    fireEvent.press(menuButton);

    expect(getByText('Buscar Propiedades')).toBeTruthy();
    expect(getByText('Reiniciar Chat')).toBeTruthy();
    expect(queryByText('Propiedades Guardadas')).toBeNull();

    const restartItem = getByText('Reiniciar Chat');
    fireEvent.press(restartItem);

    expect(getByText('Bienvenido a Hubik')).toBeTruthy();
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

describe('HomeScreen (AI listing composer)', () => {
  const partialDraft = { operation_type: 'sale', property_type: 'Apartment' };

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

  const readyDraft = { ...completeDraft, catastro: '9872023VH5797S0001WX' };

  const intakeResult = (data: Record<string, unknown>, message = 'Listo.') => ({
    data,
    missing_fields: [],
    assistant_message: message,
    ready_to_confirm: true,
  });

  const publishedProperty = {
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
    amenities: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = mockAgentAuth;
    mockRecorderState.status = 'idle';
    (chatApi.generatePropertyDescription as jest.Mock).mockResolvedValue({
      description: 'Piso luminoso en el centro de Madrid.',
    });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.[buttons.length - 1]?.onPress?.();
    });
  });

  const startComposer = async (utils: ReturnType<typeof render>) => {
    const input = utils.getByPlaceholderText('Escriba su consulta aquí...');
    fireEvent.changeText(input, '/agregar-propiedad');
    fireEvent.press(utils.getByText('Enviar'));
    await waitFor(() => utils.getByText('0 de 9 datos'));
    return input;
  };

  const send = (utils: ReturnType<typeof render>, input: ReturnType<typeof render>['getByPlaceholderText'] extends never ? never : any, text: string) => {
    fireEvent.changeText(input, text);
    fireEvent.press(utils.getByText('Enviar'));
  };

  it('starts the composer when the agent types /agregar-propiedad and invites a free description', async () => {
    const utils = render(<HomeScreen />);

    await startComposer(utils);

    expect(await utils.findByText(/Cuénteme la propiedad con sus propias palabras/)).toBeTruthy();
    expect(utils.queryByText(/indíqueme la referencia catastral/)).toBeNull();
    expect(chatApi.sendChatQuery).not.toHaveBeenCalled();
  });

  it('starts the composer from "Registrar Vivienda" in the sidebar', async () => {
    const utils = render(<HomeScreen />);

    fireEvent.press(utils.getByLabelText('Menú de opciones'));
    fireEvent.press(utils.getByText('Registrar Vivienda'));

    await waitFor(() => {
      expect(utils.getByText('/agregar-propiedad')).toBeTruthy();
      expect(utils.getByText('0 de 9 datos')).toBeTruthy();
    });
  });

  it('fills the live draft from a partial description without writing to Supabase', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      ...intakeResult(partialDraft, 'Me falta: precio, baños, metros cuadrados, ciudad y dirección.'),
      ready_to_confirm: false,
    });
    const utils = render(<HomeScreen />);
    const input = await startComposer(utils);

    send(utils, input, 'Quiero vender mi piso');

    await waitFor(() => {
      expect(utils.getByText(/Me falta: precio, baños, metros cuadrados, ciudad y dirección/)).toBeTruthy();
      expect(utils.getByText('2 de 9 datos')).toBeTruthy();
    });
    expect(chatApi.publishProperty).not.toHaveBeenCalled();
  });

  it('does not restart an open composer and keeps the draft', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      ...intakeResult(partialDraft),
      ready_to_confirm: false,
    });
    const utils = render(<HomeScreen />);
    const input = await startComposer(utils);
    send(utils, input, 'Quiero vender mi piso');
    await waitFor(() => utils.getByText('2 de 9 datos'));

    send(utils, input, '/agregar-propiedad');

    await waitFor(() => {
      expect(utils.getByText(/Ya estamos creando una propiedad/)).toBeTruthy();
    });
    expect(utils.getByText('2 de 9 datos')).toBeTruthy();
  });

  it('adds photos from the composer button after asking for permission, without uploading', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.jpg' }, { uri: 'file://b.jpg' }],
    });
    const utils = render(<HomeScreen />);
    await startComposer(utils);

    fireEvent.press(utils.getByLabelText('Añadir fotos'));

    await waitFor(() => {
      expect(utils.getByText('2 fotos')).toBeTruthy();
    });
    expect(ImagePicker.getMediaLibraryPermissionsAsync).toHaveBeenCalled();
    expect(propertyImages.uploadPropertyImages).not.toHaveBeenCalled();
  });

  it('stops cleanly when the photo permission is denied', async () => {
    (ImagePicker.getMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    const utils = render(<HomeScreen />);
    await startComposer(utils);

    fireEvent.press(utils.getByLabelText('Añadir fotos'));

    await waitFor(() => {
      expect(utils.getByText(/permiso para acceder a sus fotos/)).toBeTruthy();
    });
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(utils.getByText('Añadir fotos')).toBeTruthy();
  });

  it('marks the location from the composer button and shows it in the draft', async () => {
    const utils = render(<HomeScreen />);
    await startComposer(utils);
    expect(utils.getByText('Marcar ubicación')).toBeTruthy();

    fireEvent.press(utils.getByLabelText('Marcar ubicación en el mapa'));
    await waitFor(() => utils.getByText(/Confirmar ubicación/));
    fireEvent.press(utils.getByText(/Confirmar ubicación/));

    await waitFor(() => {
      expect(utils.getByText('Ubicación marcada')).toBeTruthy();
    });
  });

  it('fixes a field inline without calling the AI and keeps photos and location', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce(intakeResult(readyDraft));
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.jpg' }],
    });
    const utils = render(<HomeScreen />);
    const input = await startComposer(utils);
    send(utils, input, 'Vendo mi piso en Madrid');
    await waitFor(() => utils.getByText('9 de 9 datos'));
    fireEvent.press(utils.getByLabelText('Añadir fotos'));
    await waitFor(() => utils.getByText('1 foto'));

    fireEvent.press(utils.getByLabelText('Ver la ficha completa'));
    fireEvent.press(utils.getByLabelText(/^Precio: .*Toque para editar$/));
    fireEvent.changeText(utils.getByLabelText('Editar precio'), '399000');
    fireEvent.press(utils.getByLabelText('Guardar'));

    await waitFor(() => {
      expect(utils.getByLabelText(/^Precio: 399\.000 €/)).toBeTruthy();
    });
    expect(chatApi.intakeProperty).toHaveBeenCalledTimes(1);
    expect(utils.getByText('1 foto')).toBeTruthy();
  });

  it('applies a correction sent as a message without touching photos', async () => {
    (chatApi.intakeProperty as jest.Mock)
      .mockResolvedValueOnce(intakeResult(readyDraft))
      .mockResolvedValueOnce(intakeResult({ ...readyDraft, price: 399000 }));
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.jpg' }, { uri: 'file://b.jpg' }],
    });
    const utils = render(<HomeScreen />);
    const input = await startComposer(utils);
    send(utils, input, 'Vendo mi piso en Madrid');
    await waitFor(() => utils.getByText('9 de 9 datos'));
    fireEvent.press(utils.getByLabelText('Añadir fotos'));
    await waitFor(() => utils.getByText('2 fotos'));

    send(utils, input, 'el precio es 399 mil');

    await waitFor(() => {
      expect(chatApi.intakeProperty).toHaveBeenLastCalledWith(
        'el precio es 399 mil',
        expect.objectContaining({ price: 420000, images: ['file://a.jpg', 'file://b.jpg'] })
      );
    });
    expect(utils.getByText('2 fotos')).toBeTruthy();
    expect(utils.getByText('9 de 9 datos')).toBeTruthy();
  });

  it('publishes from the panel after confirmation, uploading the photos as one batch', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce(intakeResult(readyDraft));
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file://a.jpg' }],
    });
    (propertyImages.uploadPropertyImages as jest.Mock).mockResolvedValueOnce(['https://storage.example.com/a.jpg']);
    (chatApi.publishProperty as jest.Mock).mockResolvedValueOnce(publishedProperty);
    const utils = render(<HomeScreen />);
    const input = await startComposer(utils);
    send(utils, input, 'Vendo mi piso en Madrid');
    await waitFor(() => utils.getByText('9 de 9 datos'));
    fireEvent.press(utils.getByLabelText('Añadir fotos'));
    await waitFor(() => utils.getByText('1 foto'));

    fireEvent.press(utils.getByLabelText('Publicar propiedad'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('¿Publicar esta propiedad?', expect.any(String), expect.any(Array));
      expect(propertyImages.uploadPropertyImages).toHaveBeenCalledWith(expect.any(String), ['file://a.jpg']);
      expect(chatApi.publishProperty).toHaveBeenCalledWith(
        expect.objectContaining({ ...readyDraft, images: ['https://storage.example.com/a.jpg'] })
      );
      expect(utils.getByText(/Publiqué "Piso en venta en Madrid"/)).toBeTruthy();
    });
    expect(utils.queryByText('0 de 9 datos')).toBeNull();
  });

  it('asks for confirmation when the agent types "publicar" and the draft is ready', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce(intakeResult(readyDraft));
    (chatApi.publishProperty as jest.Mock).mockResolvedValueOnce(publishedProperty);
    const utils = render(<HomeScreen />);
    const input = await startComposer(utils);
    send(utils, input, 'Vendo mi piso en Madrid');
    await waitFor(() => utils.getByText('9 de 9 datos'));

    send(utils, input, 'publicar');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledTimes(1);
      expect(chatApi.publishProperty).toHaveBeenCalledTimes(1);
    });
    expect(chatApi.intakeProperty).toHaveBeenCalledTimes(1);
  });

  it('treats "publicar" as normal text while required fields are still missing', async () => {
    (chatApi.intakeProperty as jest.Mock).mockResolvedValueOnce({
      ...intakeResult(partialDraft, 'Me falta: precio.'),
      ready_to_confirm: false,
    });
    const utils = render(<HomeScreen />);
    const input = await startComposer(utils);

    send(utils, input, 'publicar');

    await waitFor(() => {
      expect(chatApi.intakeProperty).toHaveBeenCalledWith('publicar', {});
    });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('describes the property with a voice note and fills the draft', async () => {
    (chatApi.intakePropertyAudio as jest.Mock).mockResolvedValueOnce({
      transcript: 'Quiero registrar un piso en Madrid calle Mayor 12 por 420000 euros con 3 habitaciones y 2 baños',
      ...intakeResult(readyDraft, '¡Perfecto! Ya tengo todos los datos necesarios.'),
    });
    const utils = render(<HomeScreen />);
    await startComposer(utils);

    const micButton = utils.getByLabelText('Hablar por micrófono');
    fireEvent.press(micButton);
    fireEvent.press(micButton);

    await waitFor(() => {
      expect(utils.getByText(/Quiero registrar un piso en Madrid calle Mayor 12/)).toBeTruthy();
      expect(utils.getByText('9 de 9 datos')).toBeTruthy();
      expect(utils.getByText('Faltan fotos y ubicación')).toBeTruthy();
    });
  });

  it('cancels the composer and returns to normal search chat', async () => {
    const utils = render(<HomeScreen />);
    const input = await startComposer(utils);

    send(utils, input, 'cancelar registro');

    await waitFor(() => {
      expect(utils.getByText(/cancelé el registro/)).toBeTruthy();
    });
    expect(utils.queryByText('0 de 9 datos')).toBeNull();
    expect(utils.queryByLabelText('Añadir fotos')).toBeNull();

    (chatApi.sendChatQuery as jest.Mock).mockResolvedValueOnce({ answer: 'Found 1 property in Austin', data: [] });
    send(utils, input, '2-bed in Austin');

    await waitFor(() => {
      expect(chatApi.sendChatQuery).toHaveBeenCalledWith('2-bed in Austin');
    });
  });

  it('closes an open composer when the agent restarts the chat from the menu', async () => {
    const utils = render(<HomeScreen />);
    await startComposer(utils);

    fireEvent.press(utils.getByLabelText('Menú de opciones'));
    fireEvent.press(utils.getByText('Reiniciar Chat'));

    await waitFor(() => {
      expect(utils.queryByText('0 de 9 datos')).toBeNull();
    });
  });
});

describe('HomeScreen shared conversation', () => {
  const Appender = () => {
    const { appendMessages, messages } = useConversation();
    return (
      <>
        <Text
          testID="append-from-other-screen"
          onPress={() =>
            appendMessages({ id: 'other-1', sender: 'assistant', text: 'Respuesta desde otra pantalla', timestamp: 'ahora' })
          }
        >
          append
        </Text>
        <Text testID="shared-count">{messages.length}</Text>
      </>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = mockSignedOutAuth;
    mockRecorderState.status = 'idle';
  });

  it('shows messages that another screen added to the conversation', async () => {
    const utils = render(
      <ConversationProvider>
        <HomeScreen />
        <Appender />
      </ConversationProvider>
    );

    fireEvent.press(utils.getByTestId('append-from-other-screen'));

    expect(await utils.findByText('Respuesta desde otra pantalla')).toBeTruthy();
  });

  it('puts what is typed here into the shared history', async () => {
    (chatApi.sendChatQuery as jest.Mock).mockResolvedValue({ answer: 'Encontré 1 propiedad', data: [] });
    const utils = render(
      <ConversationProvider>
        <HomeScreen />
        <Appender />
      </ConversationProvider>
    );

    fireEvent.changeText(utils.getByPlaceholderText('Escriba su consulta aquí...'), 'pisos en Madrid');
    fireEvent.press(utils.getByText('Enviar'));

    await waitFor(() => expect(utils.getByTestId('shared-count').props.children).toBe(2));
  });

  it('resets the shared conversation from "Reiniciar Chat"', async () => {
    const utils = render(
      <ConversationProvider>
        <HomeScreen />
        <Appender />
      </ConversationProvider>
    );
    fireEvent.press(utils.getByTestId('append-from-other-screen'));
    await utils.findByText('Respuesta desde otra pantalla');

    fireEvent.press(utils.getByLabelText('Menú de opciones'));
    fireEvent.press(utils.getByText('Reiniciar Chat'));

    await waitFor(() => expect(utils.queryByText('Respuesta desde otra pantalla')).toBeNull());
    expect(utils.getByTestId('shared-count').props.children).toBe(0);
  });
});

describe('HomeScreen newest message', () => {
  const Appender = () => {
    const { appendMessages } = useConversation();
    return (
      <Text
        testID="append-message"
        onPress={() => appendMessages({ id: `new-${Date.now()}`, sender: 'assistant', text: 'Nueva respuesta', timestamp: 'Ahora' })}
      >
        append
      </Text>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = mockAgentAuth;
    mockRecorderState.status = 'idle';
  });

  it('scrolls to the newest message whenever one is added, so a reply is never left below the fold', () => {
    jest.useFakeTimers();
    const scrollSpy = jest.spyOn(FlatList.prototype, 'scrollToEnd').mockImplementation(() => undefined);
    const utils = render(
      <ConversationProvider>
        <HomeScreen />
        <Appender />
      </ConversationProvider>
    );
    act(() => {
      jest.advanceTimersByTime(200);
    });
    scrollSpy.mockClear();

    fireEvent.press(utils.getByTestId('append-message'));
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(scrollSpy).toHaveBeenCalledWith({ animated: true });
    scrollSpy.mockRestore();
    jest.useRealTimers();
  });

  it('does not scroll the start screen out of view when the conversation is empty or reset', () => {
    jest.useFakeTimers();
    const scrollSpy = jest.spyOn(FlatList.prototype, 'scrollToEnd').mockImplementation(() => undefined);
    const Controls = () => {
      const { appendMessages, reset } = useConversation();
      return (
        <>
          <Text
            testID="add"
            onPress={() => appendMessages({ id: 'm-1', sender: 'assistant', text: 'Hola', timestamp: 'Ahora' })}
          >
            add
          </Text>
          <Text testID="reset" onPress={reset}>
            reset
          </Text>
        </>
      );
    };
    const utils = render(
      <ConversationProvider>
        <HomeScreen />
        <Controls />
      </ConversationProvider>
    );
    fireEvent.press(utils.getByTestId('add'));
    act(() => {
      jest.advanceTimersByTime(200);
    });
    scrollSpy.mockClear();

    fireEvent.press(utils.getByTestId('reset'));
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(scrollSpy).not.toHaveBeenCalled();
    scrollSpy.mockRestore();
    jest.useRealTimers();
  });

  it('scrolls to the assistant reply when the listing composer starts', async () => {
    const scrollSpy = jest.spyOn(FlatList.prototype, 'scrollToEnd').mockImplementation(() => undefined);
    const utils = render(<HomeScreen />);
    scrollSpy.mockClear();

    fireEvent.changeText(utils.getByPlaceholderText('Escriba su consulta aquí...'), '/agregar-propiedad');
    fireEvent.press(utils.getByText('Enviar'));

    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    scrollSpy.mockRestore();
  });

  it('shows message times in Spanish', async () => {
    (chatApi.sendChatQuery as jest.Mock).mockResolvedValue({ answer: 'Encontré 1 propiedad', data: [] });
    const utils = render(<HomeScreen />);

    fireEvent.changeText(utils.getByPlaceholderText('Escriba su consulta aquí...'), 'pisos en Madrid');
    fireEvent.press(utils.getByText('Enviar'));

    await waitFor(() => expect(utils.getAllByText('Ahora').length).toBeGreaterThanOrEqual(2));
    expect(utils.queryByText('Just now')).toBeNull();
  });
});
