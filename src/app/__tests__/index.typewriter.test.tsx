import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import HomeScreen from '../index';
import { ConversationProvider } from '../../hooks/ConversationProvider';
import { useConversation } from '../../hooks/useConversation';
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
const TYPING = 'Hubik está escribiendo…';

describe('HomeScreen typewriter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = buildAuth('agent');
    mockRecorderStatus = 'idle';
  });

  it('shows the typing indicator while the search is pending, then writes the reply in', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    (chatApi.sendChatQuery as jest.Mock).mockReturnValue(new Promise((r) => (resolve = r)));
    const utils = renderHome();

    fireEvent.changeText(utils.getByPlaceholderText(PLACEHOLDER), 'pisos en Valencia');
    fireEvent.press(utils.getByText('Enviar'));
    expect(await utils.findByText(TYPING)).toBeTruthy();

    await act(async () => resolve({ answer: 'Hay nueve pisos en Valencia desde 350 USD.', data: [] }));

    expect(utils.queryByText(TYPING)).toBeNull();
    expect(utils.queryByText('Hay nueve pisos en Valencia desde 350 USD.')).toBeNull();
    expect(await utils.findByText('Hay nueve pisos en Valencia desde 350 USD.')).toBeTruthy();
  });

  it('shows a conversation that was already there instantly when returning to the chat', () => {
    const tree = (showHome: boolean) => (
      <ConversationProvider>
        <Seed />
        {showHome && <HomeScreen />}
      </ConversationProvider>
    );
    const utils = render(tree(false));

    utils.rerender(tree(true));

    expect(utils.getByText('Respuesta anterior completa')).toBeTruthy();
  });
});

function Seed() {
  const { messages, setMessages } = useConversation();
  if (messages.length === 0) {
    setMessages([{ id: 'old', sender: 'assistant', text: 'Respuesta anterior completa', timestamp: 'Ahora' }]);
  }
  return null;
}
