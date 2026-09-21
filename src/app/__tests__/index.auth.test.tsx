import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../index';
import * as chatApi from '../../services/chatApi';
import { getCapabilities } from '../../lib/roles';
import { AuthState, Role } from '../../types/auth';

const mockPush = jest.fn();
const mockSignOut = jest.fn();
let mockParams: Record<string, string> = {};
let mockAuth: AuthState;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

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
  generatePropertyTitle: jest.fn(() => 'Piso en venta en Madrid'),
  VOICE_NOTE_MIME_TYPE: 'audio/mp4',
}));

jest.mock('../../services/propertyImages', () => ({
  uploadPropertyImages: jest.fn(),
  MAX_PROPERTY_IMAGES: 10,
}));

jest.mock('expo-file-system', () => ({ readAsStringAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual('react-native');
  return { WebView: View };
});
jest.mock('../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    state: { status: 'idle' },
    start: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
  }),
}));

const buildAuth = (role: Role | null): AuthState => ({
  status: role ? 'signedIn' : 'signedOut',
  profile: role ? { userId: 'u1', role, agencyId: role === 'client' ? null : 'a1', displayName: null } : null,
  capabilities: getCapabilities(role),
  signIn: jest.fn(),
  signOut: mockSignOut,
  refreshProfile: jest.fn(),
});

const typeAndSend = (utils: ReturnType<typeof render>, text: string) => {
  fireEvent.changeText(utils.getByPlaceholderText('Escriba su consulta aquí...'), text);
  fireEvent.press(utils.getByText('Enviar'));
};

describe('HomeScreen registration access by role', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockSignOut.mockResolvedValue(undefined);
  });

  it('asks a signed-out visitor to sign in instead of starting the registration', async () => {
    mockAuth = buildAuth(null);
    const utils = render(<HomeScreen />);

    typeAndSend(utils, '/agregar-propiedad');

    expect(
      await utils.findByText(/inicie sesión con su cuenta de agente/)
    ).toBeTruthy();
    expect(utils.queryByText(/Cuénteme la propiedad con sus propias palabras/)).toBeNull();
  });

  it.each<Role>(['client', 'owner'])(
    'tells a %s that only agents can register, and does not start the flow',
    async (role) => {
      mockAuth = buildAuth(role);
      const utils = render(<HomeScreen />);

      typeAndSend(utils, '/agregar-propiedad');

      expect(await utils.findByText(/Solo los agentes de una inmobiliaria/)).toBeTruthy();
      expect(utils.queryByText(/Cuénteme la propiedad con sus propias palabras/)).toBeNull();
    }
  );

  it('starts the registration for an agent', async () => {
    mockAuth = buildAuth('agent');
    const utils = render(<HomeScreen />);

    typeAndSend(utils, '/agregar-propiedad');

    expect(await utils.findByText(/Cuénteme la propiedad con sus propias palabras/)).toBeTruthy();
  });

  it('ignores the startRegistration link parameter for non-agents', async () => {
    mockAuth = buildAuth('client');
    mockParams = { startRegistration: '1' };
    const utils = render(<HomeScreen />);

    expect(await utils.findByText(/Solo los agentes de una inmobiliaria/)).toBeTruthy();
    expect(utils.queryByText(/Cuénteme la propiedad con sus propias palabras/)).toBeNull();
    expect(chatApi.intakeProperty).not.toHaveBeenCalled();
  });
});

describe('HomeScreen account menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockSignOut.mockResolvedValue(undefined);
  });

  const openMenu = (utils: ReturnType<typeof render>) =>
    fireEvent.press(utils.getByLabelText('Menú de opciones'));

  it('hides "Registrar Vivienda" and offers sign in when signed out', () => {
    mockAuth = buildAuth(null);
    const utils = render(<HomeScreen />);
    openMenu(utils);

    expect(utils.queryByText('Registrar Vivienda')).toBeNull();
    expect(utils.getByLabelText('Iniciar sesión')).toBeTruthy();
  });

  it('opens the sign-in screen from the menu', async () => {
    mockAuth = buildAuth(null);
    const utils = render(<HomeScreen />);
    openMenu(utils);

    fireEvent.press(utils.getByLabelText('Iniciar sesión'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/sign-in'));
  });

  it('shows "Registrar Vivienda" and sign out for an agent, and signs out', async () => {
    mockAuth = buildAuth('agent');
    const utils = render(<HomeScreen />);
    openMenu(utils);

    expect(utils.getByText('Registrar Vivienda')).toBeTruthy();
    fireEvent.press(utils.getByText('Cerrar sesión'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });

  it('lets a client open the create-agency screen', async () => {
    mockAuth = buildAuth('client');
    const utils = render(<HomeScreen />);
    openMenu(utils);

    expect(utils.queryByText('Registrar Vivienda')).toBeNull();
    fireEvent.press(utils.getByText('Tengo una inmobiliaria'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/create-agency'));
  });

  it('lets an owner open their agency', async () => {
    mockAuth = buildAuth('owner');
    const utils = render(<HomeScreen />);
    openMenu(utils);

    fireEvent.press(utils.getByLabelText('Mi inmobiliaria'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/agency'));
  });
});
