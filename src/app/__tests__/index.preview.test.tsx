import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import HomeScreen from '../index';
import * as chatApi from '../../services/chatApi';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const mockAgentAuth = {
  status: 'signedIn',
  profile: { userId: 'agent-1', role: 'agent', agencyId: 'agency-1', displayName: 'Ana' },
  capabilities: { canRegisterProperty: true, canCreateAgency: false, canViewAgencyListings: false },
  signIn: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
};

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAgentAuth,
}));

jest.mock('../../services/chatApi', () => ({
  sendChatQuery: jest.fn(),
  sendChatQueryAudio: jest.fn(),
  fetchDynamicSuggestions: jest.fn().mockResolvedValue([]),
  intakeProperty: jest.fn(),
  intakePropertyAudio: jest.fn(),
  publishProperty: jest.fn(),
  generatePropertyDescription: jest.fn().mockResolvedValue({ description: 'Piso luminoso.' }),
  generatePropertyTitle: jest.fn(() => 'Piso en venta en Madrid'),
  VOICE_NOTE_MIME_TYPE: 'audio/mp4',
}));

jest.mock('../../services/propertyImages', () => ({
  uploadPropertyImages: jest.fn(),
  MAX_PROPERTY_IMAGES: 10,
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64'),
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

const READY_DRAFT = {
  catastro: '9872023VH5797S0001WX',
  operation_type: 'sale',
  property_type: 'Apartment',
  price: 420000,
  bedrooms: 3,
  bathrooms: 2,
  square_meters: 90,
  city: 'Madrid',
  address: 'Calle Mayor 12',
};

const PHOTOS = ['file://a.jpg', 'file://b.jpg', 'file://c.jpg'];

describe('HomeScreen listing preview and photo order', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    (chatApi.intakeProperty as jest.Mock).mockResolvedValue({
      data: READY_DRAFT,
      missing_fields: [],
      assistant_message: 'Listo.',
      ready_to_confirm: true,
    });
  });

  const startReadyComposer = async (photos: string[]) => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: photos.map((uri) => ({ uri })),
    });
    const utils = render(<HomeScreen />);
    const input = utils.getByPlaceholderText('Escriba su consulta aquí...');
    fireEvent.changeText(input, '/agregar-propiedad');
    fireEvent.press(utils.getByText('Enviar'));
    await waitFor(() => utils.getByText('0 de 9 datos'));
    fireEvent.changeText(input, 'Vendo mi piso en Madrid');
    fireEvent.press(utils.getByText('Enviar'));
    await waitFor(() => utils.getByText('9 de 9 datos'));
    fireEvent.press(utils.getByLabelText('Añadir fotos'));
    await waitFor(() => utils.getByText(`${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}`));
    return utils;
  };

  const pushedParams = () => mockPush.mock.calls[0][0].params;

  it('opens the real listing screen with the draft in preview mode', async () => {
    const utils = await startReadyComposer(PHOTOS);

    fireEvent.press(utils.getByLabelText('Ver cómo quedará el anuncio'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0].pathname).toBe('/property/[id]');
    expect(pushedParams()).toEqual(
      expect.objectContaining({
        id: 'draft-preview',
        preview: '1',
        price: '420000',
        city: 'Madrid',
        images: JSON.stringify(PHOTOS),
        image_url: PHOTOS[0],
      })
    );
    expect(chatApi.publishProperty).not.toHaveBeenCalled();
    expect(utils.getByText('9 de 9 datos')).toBeTruthy();
  });

  it('offers no ordering with a single photo', async () => {
    const utils = await startReadyComposer([PHOTOS[0]]);

    expect(utils.queryByLabelText('Ordenar las fotos')).toBeNull();
  });

  it('applies the new order on Listo, and the preview follows it', async () => {
    const utils = await startReadyComposer(PHOTOS);

    fireEvent.press(utils.getByLabelText('Ordenar las fotos'));
    expect(utils.getByText('Ordenar fotos')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Mover foto 1 hacia abajo'));
    fireEvent.press(utils.getByLabelText('Listo'));
    await waitFor(() => expect(utils.queryByText('Ordenar fotos')).toBeNull());

    fireEvent.press(utils.getByLabelText('Ver cómo quedará el anuncio'));

    expect(pushedParams().images).toBe(JSON.stringify([PHOTOS[1], PHOTOS[0], PHOTOS[2]]));
    expect(pushedParams().image_url).toBe(PHOTOS[1]);
  });

  it('keeps the order when the agent cancels', async () => {
    const utils = await startReadyComposer(PHOTOS);

    fireEvent.press(utils.getByLabelText('Ordenar las fotos'));
    fireEvent.press(utils.getByLabelText('Mover foto 1 hacia abajo'));
    fireEvent.press(utils.getByLabelText('Cancelar'));
    await waitFor(() => expect(utils.queryByText('Ordenar fotos')).toBeNull());

    fireEvent.press(utils.getByLabelText('Ver cómo quedará el anuncio'));

    expect(pushedParams().images).toBe(JSON.stringify(PHOTOS));
  });
});
