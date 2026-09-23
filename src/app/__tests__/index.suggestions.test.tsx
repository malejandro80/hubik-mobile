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

const mockStop = jest.fn();
let mockRecorderStatus = 'idle';

jest.mock('../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    state: { status: mockRecorderStatus },
    start: jest.fn(),
    stop: mockStop,
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
const MIC_STOP_LABEL = 'Detener grabación de nota de voz';

const chip = (text: string) => `Search for ${text}`;

describe('HomeScreen search suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = buildAuth('agent');
    mockRecorderStatus = 'idle';
  });

  const search = async (utils: ReturnType<typeof renderHome>, text: string, answer: string) => {
    fireEvent.changeText(utils.getByPlaceholderText(PLACEHOLDER), text);
    fireEvent.press(utils.getByText('Enviar'));
    await utils.findByText(answer);
  };

  it('shows the reply suggestions as chips and sends a tapped chip as a new search', async () => {
    (chatApi.sendChatQuery as jest.Mock)
      .mockResolvedValueOnce({ answer: 'Hay 2 pisos en Valencia.', data: [], suggestions: ['Pisos en Madrid'] })
      .mockResolvedValueOnce({ answer: 'Hay 1 piso en Madrid.', data: [], suggestions: [] });
    const utils = renderHome();

    await search(utils, 'pisos en Valencia', 'Hay 2 pisos en Valencia.');
    fireEvent.press(utils.getByLabelText(chip('Pisos en Madrid')));

    expect(await utils.findByText('Hay 1 piso en Madrid.')).toBeTruthy();
    expect(chatApi.sendChatQuery).toHaveBeenLastCalledWith('Pisos en Madrid');
  });

  it('keeps chips only under the latest reply', async () => {
    (chatApi.sendChatQuery as jest.Mock)
      .mockResolvedValueOnce({ answer: 'Primera respuesta.', data: [], suggestions: ['Pisos en Madrid'] })
      .mockResolvedValueOnce({ answer: 'Segunda respuesta.', data: [], suggestions: ['Casas en Sevilla'] });
    const utils = renderHome();

    await search(utils, 'pisos en Valencia', 'Primera respuesta.');
    await search(utils, 'casas', 'Segunda respuesta.');

    expect(utils.queryByLabelText(chip('Pisos en Madrid'))).toBeNull();
    expect(utils.getByLabelText(chip('Casas en Sevilla'))).toBeTruthy();
  });

  it('shows suggestions from a voice search too', async () => {
    const FileSystem = jest.requireMock('expo-file-system/legacy');
    FileSystem.readAsStringAsync.mockResolvedValue('YmFzZTY0');
    (chatApi.sendChatQueryAudio as jest.Mock).mockResolvedValue({
      transcript: 'pisos en Valencia',
      answer: 'Hay 2 pisos en Valencia.',
      data: [],
      suggestions: ['Pisos en Madrid'],
    });
    mockStop.mockResolvedValue({ uri: 'file:///nota.m4a' });
    mockRecorderStatus = 'recording';
    const utils = renderHome();

    fireEvent.press(utils.getByLabelText(MIC_STOP_LABEL));

    expect(await utils.findByText('Hay 2 pisos en Valencia.')).toBeTruthy();
    expect(utils.getByLabelText(chip('Pisos en Madrid'))).toBeTruthy();
  });
});
