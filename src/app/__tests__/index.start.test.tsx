import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../index';
import { ConversationProvider } from '../../hooks/ConversationProvider';
import * as chatApi from '../../services/chatApi';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const buildAuth = (role: 'client' | 'agent' | 'owner' | null, displayName: string | null = 'Ana') => ({
  status: role ? 'signedIn' : 'signedOut',
  profile: role ? { userId: 'u1', role, agencyId: role === 'client' ? null : 'a1', displayName } : null,
  capabilities: {
    canRegisterProperty: role === 'agent' || role === 'owner',
    canCreateAgency: role === 'client',
    canViewAgencyListings: role === 'owner',
  },
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
});

let mockAuth: Record<string, unknown> = buildAuth(null);

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../services/chatApi', () => ({
  sendChatQuery: jest.fn(),
  sendChatQueryAudio: jest.fn(),
  fetchDynamicSuggestions: jest.fn().mockResolvedValue([]),
  intakeProperty: jest.fn(),
  intakePropertyAudio: jest.fn(),
  publishProperty: jest.fn(),
  generatePropertyDescription: jest.fn(),
  generatePropertyTitle: jest.fn(() => 'Piso'),
  VOICE_NOTE_MIME_TYPE: 'audio/mp4',
}));

jest.mock('../../services/propertyImages', () => ({
  uploadPropertyImages: jest.fn(),
  MAX_PROPERTY_IMAGES: 10,
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-location', () => ({
  reverseGeocodeAsync: jest.fn().mockResolvedValue([]),
}));

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));

jest.mock('../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    state: { status: 'idle' },
    start: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
  }),
}));

const renderHome = () =>
  render(
    <ConversationProvider>
      <HomeScreen />
    </ConversationProvider>
  );

describe('HomeScreen start screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = buildAuth(null);
    (chatApi.sendChatQuery as jest.Mock).mockResolvedValue({ answer: 'Encontré 2 propiedades', data: [] });
  });

  it('greets a visitor and offers search and sign in, but not publishing or the agency', () => {
    const { getByText, queryByText } = renderHome();

    expect(getByText('Bienvenido a Hubik')).toBeTruthy();
    expect(getByText('Buscar propiedades')).toBeTruthy();
    expect(getByText('Iniciar sesión')).toBeTruthy();
    expect(queryByText('Publicar una propiedad')).toBeNull();
    expect(queryByText('Mi inmobiliaria')).toBeNull();
  });

  it('greets a signed-in user by name and offers publishing to an agent', () => {
    mockAuth = buildAuth('agent', 'Ana');
    const { getByText, queryByText } = renderHome();

    expect(getByText('Hola, Ana')).toBeTruthy();
    expect(getByText('Publicar una propiedad')).toBeTruthy();
    expect(queryByText('Iniciar sesión')).toBeNull();
  });

  it('runs the search when the search card is tapped, and the chat takes over', async () => {
    const { getByLabelText, getByText, queryByText } = renderHome();

    fireEvent.press(getByLabelText('Buscar propiedades. Vea lo que hay disponible'));

    await waitFor(() => expect(chatApi.sendChatQuery).toHaveBeenCalledWith('Muéstrame las propiedades disponibles'));
    await waitFor(() => expect(getByText('Encontré 2 propiedades')).toBeTruthy());
    expect(getByText('Muéstrame las propiedades disponibles')).toBeTruthy();
    expect(queryByText('Empezar')).toBeNull();
  });

  it('runs an example exactly as written', async () => {
    const { getByLabelText } = renderHome();

    fireEvent.press(getByLabelText('Probar: Pisos en venta en Valencia'));

    await waitFor(() => expect(chatApi.sendChatQuery).toHaveBeenCalledWith('Pisos en venta en Valencia'));
  });

  it('starts the listing composer for an agent', async () => {
    mockAuth = buildAuth('agent');
    const { getByLabelText, findByText } = renderHome();

    fireEvent.press(getByLabelText('Publicar una propiedad. Descríbala y suba fotos'));

    expect(await findByText(/Cuénteme la propiedad con sus propias palabras/)).toBeTruthy();
    expect(chatApi.sendChatQuery).not.toHaveBeenCalled();
  });

  it('opens sign in and the agency screen without sending a message', () => {
    mockAuth = buildAuth('owner');
    const owner = renderHome();
    fireEvent.press(owner.getByLabelText('Mi inmobiliaria. Agentes y propiedades'));
    expect(mockPush).toHaveBeenCalledWith('/agency');
    owner.unmount();

    mockAuth = buildAuth(null);
    const visitor = renderHome();
    fireEvent.press(visitor.getByLabelText('Iniciar sesión. Con Google o Apple'));
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
    expect(chatApi.sendChatQuery).not.toHaveBeenCalled();
  });

  it('comes back after "Reiniciar Chat"', async () => {
    const { getByLabelText, getByText, queryByText } = renderHome();
    fireEvent.press(getByLabelText('Probar: Pisos en venta en Valencia'));
    await waitFor(() => expect(getByText('Encontré 2 propiedades')).toBeTruthy());
    expect(queryByText('Empezar')).toBeNull();

    fireEvent.press(getByLabelText('Menú de opciones'));
    fireEvent.press(getByText('Reiniciar Chat'));

    await waitFor(() => expect(getByText('Empezar')).toBeTruthy());
    expect(queryByText('Encontré 2 propiedades')).toBeNull();
  });
});
