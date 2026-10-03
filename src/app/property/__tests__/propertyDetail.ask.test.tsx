import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PropertyDetailScreen from '../[id]';
import { askAboutProperty } from '../../../services/propertyAskService';

jest.mock('../../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({ state: { status: 'idle' }, start: jest.fn(), stop: jest.fn(), cancel: jest.fn() }),
}));

jest.mock('../../../services/chatApi', () => ({
  generatePropertyDescription: jest.fn().mockResolvedValue({ description: 'Texto generado.' }),
}));

jest.mock('../../../services/authApi', () => ({
  fetchAgencyName: jest.fn().mockResolvedValue('Casa Norte'),
  fetchPropertyLandlord: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../services/propertyAskService', () => ({
  askAboutProperty: jest.fn(),
}));

let mockAuth: { status: string; profile: unknown } = { status: 'signedIn', profile: null };

jest.mock('../../../hooks/useAuth', () => {
  const { ROLE_CAPABILITIES } = jest.requireActual('../../../lib/roles');
  return {
    useAuth: () => ({
      ...mockAuth,
      capabilities: ROLE_CAPABILITIES.client,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    }),
  };
});

const mockNavigate = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, navigate: mockNavigate }),
  useLocalSearchParams: () => mockParams,
}));

const LISTING_ID = '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55';

const listing = {
  id: LISTING_ID,
  title: 'Casa en alquiler en El Bosque',
  price: '850',
  city: 'Valencia',
  bedrooms: '3',
  bathrooms: '2',
  square_meters: '220',
  property_type: 'Single Family',
  operation_type: 'rent',
  description: 'Casa amplia con jardín.',
};

const askMock = askAboutProperty as jest.Mock;

describe('PropertyDetailScreen questions about the listing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = listing;
  });

  it('answers a signed-in user on the detail, without leaving it', async () => {
    mockAuth = { status: 'signedIn', profile: { userId: 'c1', role: 'client', agencyId: null, displayName: 'Carla' } };
    askMock.mockResolvedValue({ type: 'answer', answer: 'El Bosque suele ser tranquilo (estimación orientativa).', refused: false });
    const view = render(<PropertyDetailScreen />);

    fireEvent.changeText(view.getByLabelText('Campo de consulta inmobiliaria'), '¿Qué tal el tráfico?');
    fireEvent.press(view.getByLabelText('Enviar consulta'));

    expect(await view.findByText('El Bosque suele ser tranquilo (estimación orientativa).')).toBeTruthy();
    expect(view.getByText('¿Qué tal el tráfico?')).toBeTruthy();
    expect(askMock).toHaveBeenCalledWith({
      question: '¿Qué tal el tráfico?',
      target: { kind: 'listing', id: LISTING_ID },
      history: [],
      clarifications: [],
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('offers predefined options when the question is ambiguous, and answers after one is chosen', async () => {
    mockAuth = { status: 'signedIn', profile: { userId: 'c1', role: 'client', agencyId: null, displayName: 'Carla' } };
    askMock
      .mockResolvedValueOnce({ type: 'clarify', question: '¿Para quién sería?', options: ['Pareja', 'Familia con niños'] })
      .mockResolvedValueOnce({ type: 'answer', answer: 'Para una familia, el jardín es un punto fuerte.', refused: false });
    const view = render(<PropertyDetailScreen />);

    fireEvent.changeText(view.getByLabelText('Campo de consulta inmobiliaria'), '¿Me conviene?');
    fireEvent.press(view.getByLabelText('Enviar consulta'));

    expect(await view.findByText('¿Para quién sería?')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Responder: Familia con niños'));

    expect(await view.findByText('Para una familia, el jardín es un punto fuerte.')).toBeTruthy();
    expect(askMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ clarifications: [{ question: '¿Para quién sería?', answer: 'Familia con niños' }] })
    );
  });

  it('hides the conversation to free the view, reopens it, and clears it', async () => {
    mockAuth = { status: 'signedIn', profile: { userId: 'c1', role: 'client', agencyId: null, displayName: 'Carla' } };
    askMock.mockResolvedValue({ type: 'answer', answer: 'Zona tranquila (estimación).', refused: false });
    const view = render(<PropertyDetailScreen />);

    fireEvent.changeText(view.getByLabelText('Campo de consulta inmobiliaria'), '¿Qué tal la zona?');
    fireEvent.press(view.getByLabelText('Enviar consulta'));
    expect(await view.findByText('Zona tranquila (estimación).')).toBeTruthy();

    fireEvent.press(view.getByLabelText('Ocultar conversación'));
    expect(view.queryByText('Zona tranquila (estimación).')).toBeNull();

    fireEvent.press(view.getByLabelText('Ver conversación, 1 pregunta'));
    expect(view.getByText('Zona tranquila (estimación).')).toBeTruthy();

    fireEvent.press(view.getByLabelText('Borrar conversación'));
    expect(view.queryByText('Zona tranquila (estimación).')).toBeNull();
    expect(view.queryByLabelText('Ver conversación, 1 pregunta')).toBeNull();
  });

  it('reopens a hidden conversation when a new question is asked', async () => {
    mockAuth = { status: 'signedIn', profile: { userId: 'c1', role: 'client', agencyId: null, displayName: 'Carla' } };
    askMock
      .mockResolvedValueOnce({ type: 'answer', answer: 'Primera respuesta.', refused: false })
      .mockResolvedValueOnce({ type: 'answer', answer: 'Segunda respuesta.', refused: false });
    const view = render(<PropertyDetailScreen />);

    fireEvent.changeText(view.getByLabelText('Campo de consulta inmobiliaria'), 'Uno');
    fireEvent.press(view.getByLabelText('Enviar consulta'));
    expect(await view.findByText('Primera respuesta.')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Ocultar conversación'));

    fireEvent.changeText(view.getByLabelText('Campo de consulta inmobiliaria'), 'Dos');
    fireEvent.press(view.getByLabelText('Enviar consulta'));

    expect(await view.findByText('Segunda respuesta.')).toBeTruthy();
    expect(view.getByText('Primera respuesta.')).toBeTruthy();
  });

  it('invites a signed-out visitor to sign in instead of showing the bar', () => {
    mockAuth = { status: 'signedOut', profile: null };
    const view = render(<PropertyDetailScreen />);

    expect(view.queryByLabelText('Campo de consulta inmobiliaria')).toBeNull();
    fireEvent.press(view.getByLabelText('Inicia sesión para preguntar sobre esta propiedad'));
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });
});
