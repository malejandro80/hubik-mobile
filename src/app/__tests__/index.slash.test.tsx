import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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

const PLACEHOLDER = 'Escriba su consulta aquí...';
const ROW = '/agregar-propiedad, Publicar una propiedad';
const NOTE = 'Los comandos están disponibles para agentes de una inmobiliaria';

describe('HomeScreen slash command menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = buildAuth('agent');
  });

  it('shows the command as soon as an agent types a slash, and narrows as they type', () => {
    const { getByPlaceholderText, getByLabelText, queryByLabelText } = renderHome();
    const input = getByPlaceholderText(PLACEHOLDER);

    fireEvent.changeText(input, '/');
    expect(getByLabelText(ROW)).toBeTruthy();

    fireEvent.changeText(input, '/agr');
    expect(getByLabelText(ROW)).toBeTruthy();

    fireEvent.changeText(input, '/zzz');
    expect(queryByLabelText(ROW)).toBeNull();
  });

  it('does not show the menu for ordinary text', () => {
    const { getByPlaceholderText, queryByLabelText } = renderHome();

    fireEvent.changeText(getByPlaceholderText(PLACEHOLDER), 'pisos en Madrid');

    expect(queryByLabelText(ROW)).toBeNull();
  });

  it('starts the composer when the row is tapped, clearing the input and closing the list', async () => {
    const { getByPlaceholderText, getByLabelText, queryByLabelText, findByText } = renderHome();
    const input = getByPlaceholderText(PLACEHOLDER);
    fireEvent.changeText(input, '/');

    fireEvent.press(getByLabelText(ROW));

    expect(await findByText(/Cuénteme la propiedad con sus propias palabras/)).toBeTruthy();
    expect(input.props.value).toBe('');
    expect(queryByLabelText(ROW)).toBeNull();
    expect(chatApi.sendChatQuery).not.toHaveBeenCalled();
  });

  it('still starts the composer when the whole command is typed and sent', async () => {
    const { getByPlaceholderText, getByText, findByText } = renderHome();

    fireEvent.changeText(getByPlaceholderText(PLACEHOLDER), '/agregar-propiedad');
    fireEvent.press(getByText('Enviar'));

    expect(await findByText(/Cuénteme la propiedad con sus propias palabras/)).toBeTruthy();
  });

  it.each([
    ['a client', buildAuth('client')],
    ['a signed-out visitor', buildAuth(null)],
  ])('shows %s only a note, with no command row', (_label, auth) => {
    mockAuth = auth;
    const { getByPlaceholderText, getByText, queryByLabelText } = renderHome();

    fireEvent.changeText(getByPlaceholderText(PLACEHOLDER), '/');

    expect(getByText(NOTE)).toBeTruthy();
    expect(queryByLabelText(ROW)).toBeNull();
  });
});
