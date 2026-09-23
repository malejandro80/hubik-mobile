import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AgencyScreen from '../agency';
import { ConversationProvider } from '../../hooks/ConversationProvider';
import { useConversation } from '../../hooks/useConversation';
import * as authApi from '../../services/authApi';
import { Property } from '../../types/property';

const mockPush = jest.fn();
let mockAuth: Record<string, unknown>;

jest.mock('expo-router', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    useRouter: () => ({ replace: jest.fn(), push: mockPush, back: jest.fn() }),
    Redirect: ({ href }: { href: string }) => <MockText>{`redirect:${href}`}</MockText>,
  };
});

jest.mock('../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({ state: { status: 'idle' }, start: jest.fn(), stop: jest.fn(), cancel: jest.fn() }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../services/authApi', () => ({
  fetchAgencyListings: jest.fn(),
  fetchAgencyAgents: jest.fn(),
  fetchAgentInvites: jest.fn(),
  addAgent: jest.fn(),
  cancelAgentInvite: jest.fn(),
}));

const ownerAuth = {
  status: 'signedIn',
  profile: { userId: 'u1', role: 'owner', agencyId: 'a1', displayName: 'Olga' },
  capabilities: { canRegisterProperty: false, canCreateAgency: false, canViewAgencyListings: true },
};

const listing: Property = {
  id: 'p1',
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
  agency_id: 'a1',
  agency_name: 'Casa Norte',
  agent_name: 'Ana',
};

describe('AgencyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = ownerAuth;
    (authApi.fetchAgencyAgents as jest.Mock).mockResolvedValue([]);
    (authApi.fetchAgentInvites as jest.Mock).mockResolvedValue([]);
  });

  it('lists the properties published by the owner agency', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([listing]);
    const { findByText } = render(<AgencyScreen />);

    expect(await findByText('Piso en venta en Madrid')).toBeTruthy();
    expect(authApi.fetchAgencyListings).toHaveBeenCalledWith('a1');
  });

  it('shows the agents section for the owner above the listings', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([listing]);
    (authApi.fetchAgencyAgents as jest.Mock).mockResolvedValue([{ userId: 'u2', displayName: 'Ana Pérez' }]);
    const { findByText, getByLabelText } = render(<AgencyScreen />);

    expect(await findByText('Agentes')).toBeTruthy();
    expect(await findByText('Ana Pérez')).toBeTruthy();
    expect(getByLabelText('Correo del agente')).toBeTruthy();
    expect(await findByText('Piso en venta en Madrid')).toBeTruthy();
    expect(authApi.fetchAgencyAgents).toHaveBeenCalledWith('a1');
    expect(authApi.fetchAgentInvites).toHaveBeenCalledWith('a1');
  });

  it('keeps the agents section when the agency has no listings yet', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([]);
    const { findByText } = render(<AgencyScreen />);

    expect(await findByText('Sus agentes aún no han publicado propiedades.')).toBeTruthy();
    expect(await findByText('Agentes')).toBeTruthy();
  });

  it('keeps the agents section usable when the listings fail to load', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockRejectedValue(new Error('offline'));
    const { findByText, getByLabelText } = render(<AgencyScreen />);

    expect(await findByText('No pudimos cargar las propiedades de su inmobiliaria.')).toBeTruthy();
    expect(getByLabelText('Correo del agente')).toBeTruthy();
  });

  it('opens the menu from the header and offers the owner options', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([]);
    const { getByLabelText, findByText, queryByText } = render(<AgencyScreen />);

    fireEvent.press(getByLabelText('Menú de opciones'));

    expect(await findByText('Buscar Propiedades')).toBeTruthy();
    expect(await findByText('Cerrar sesión')).toBeTruthy();
    expect(queryByText('Registrar Vivienda')).toBeNull();
  });

  it('takes the owner back to the chat from the menu', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([]);
    const { getByLabelText, findByText } = render(<AgencyScreen />);

    fireEvent.press(getByLabelText('Menú de opciones'));
    fireEvent.press(await findByText('Buscar Propiedades'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('shows an empty message when the agency has no listings', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([]);
    const { findByText } = render(<AgencyScreen />);

    expect(await findByText('Sus agentes aún no han publicado propiedades.')).toBeTruthy();
  });

  it('shows an error with a retry that reloads the listings', async () => {
    (authApi.fetchAgencyListings as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([listing]);
    const { findByText, getByLabelText } = render(<AgencyScreen />);

    expect(await findByText('No pudimos cargar las propiedades de su inmobiliaria.')).toBeTruthy();
    fireEvent.press(getByLabelText('Reintentar'));

    expect(await findByText('Piso en venta en Madrid')).toBeTruthy();
    expect(authApi.fetchAgencyListings).toHaveBeenCalledTimes(2);
  });

  it('redirects anyone who is not an owner', () => {
    mockAuth = {
      status: 'signedIn',
      profile: { userId: 'u1', role: 'client', agencyId: null, displayName: null },
      capabilities: { canRegisterProperty: false, canCreateAgency: true, canViewAgencyListings: false },
    };
    const { getByText } = render(<AgencyScreen />);

    expect(getByText('redirect:/')).toBeTruthy();
  });

  it('opens the property detail when a listing is pressed', async () => {
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([listing]);
    const { findByLabelText } = render(<AgencyScreen />);

    fireEvent.press(await findByLabelText('Ver detalle de Piso en venta en Madrid'));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/property/[id]' })
      )
    );
  });
});

describe('AgencyScreen chat', () => {
  const ana = { userId: 'u2', displayName: 'Ana Pérez' };
  const invite = { id: 'i1', email: 'luis@correo.com', createdAt: '2026-09-21T10:00:00Z' };

  const send = (utils: ReturnType<typeof render>, text: string) => {
    fireEvent.changeText(utils.getByPlaceholderText('Escriba su consulta aquí...'), text);
    fireEvent.press(utils.getByLabelText('Enviar consulta'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = ownerAuth;
    (authApi.fetchAgencyListings as jest.Mock).mockResolvedValue([]);
    (authApi.fetchAgencyAgents as jest.Mock).mockResolvedValue([]);
    (authApi.fetchAgentInvites as jest.Mock).mockResolvedValue([]);
  });

  it('shows the same chat bar as every screen, microphone included', async () => {
    const utils = render(<AgencyScreen />);

    expect(await utils.findByPlaceholderText('Escriba su consulta aquí...')).toBeTruthy();
    expect(utils.getByLabelText('Hablar por micrófono')).toBeTruthy();
  });

  it('adds an agent typed in the chat, replies and refreshes the list', async () => {
    (authApi.addAgent as jest.Mock).mockResolvedValue('agent_added');
    (authApi.fetchAgencyAgents as jest.Mock).mockResolvedValueOnce([]).mockResolvedValue([ana]);
    const utils = render(<AgencyScreen />);
    await utils.findByPlaceholderText('Escriba su consulta aquí...');

    send(utils, 'agrega a ana@correo.com como agente');

    expect(await utils.findAllByText('Listo. Esta persona ya es agente de su inmobiliaria.')).toBeTruthy();
    expect(authApi.addAgent).toHaveBeenCalledWith('ana@correo.com');
    expect(await utils.findByText('Ana Pérez')).toBeTruthy();
  });

  it('cancels a pending invite by email from the chat', async () => {
    (authApi.fetchAgentInvites as jest.Mock).mockResolvedValueOnce([invite]).mockResolvedValue([]);
    (authApi.cancelAgentInvite as jest.Mock).mockResolvedValue(undefined);
    const utils = render(<AgencyScreen />);
    await utils.findByText('luis@correo.com');

    send(utils, 'cancela la invitación de luis@correo.com');

    expect(await utils.findAllByText('Listo. Cancelé la invitación de luis@correo.com.')).toBeTruthy();
    expect(authApi.cancelAgentInvite).toHaveBeenCalledWith('i1');
    await waitFor(() => expect(utils.queryByText('luis@correo.com')).toBeNull());
  });

  it('answers how big the team is from the loaded list', async () => {
    (authApi.fetchAgencyAgents as jest.Mock).mockResolvedValue([ana]);
    const utils = render(<AgencyScreen />);
    await utils.findByText('Ana Pérez');

    send(utils, '¿cuántos agentes tengo?');

    expect(await utils.findAllByText('Tiene 1 agente y 0 invitaciones pendientes.')).toBeTruthy();
  });

  it('opens the home chat on request', async () => {
    const utils = render(<AgencyScreen />);
    await utils.findByPlaceholderText('Escriba su consulta aquí...');

    send(utils, 'vuelve al inicio');

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  it('explains what can be said and changes nothing when the message is not understood', async () => {
    const utils = render(<AgencyScreen />);
    await utils.findByPlaceholderText('Escriba su consulta aquí...');

    send(utils, 'hola');

    expect(await utils.findAllByText(/agrega a ana@correo.com como agente/)).toBeTruthy();
    expect(authApi.addAgent).not.toHaveBeenCalled();
    expect(authApi.cancelAgentInvite).not.toHaveBeenCalled();
  });

  it('lets the full conversation be read from another screen through the shared history', async () => {
    (authApi.addAgent as jest.Mock).mockResolvedValue('invited');
    const Probe = () => <Text testID="history">{useConversation().messages.map((message) => message.text).join(' | ')}</Text>;
    const utils = render(
      <ConversationProvider>
        <AgencyScreen />
        <Probe />
      </ConversationProvider>
    );
    await utils.findByPlaceholderText('Escriba su consulta aquí...');

    send(utils, 'agrega a ana@correo.com como agente');

    await waitFor(() => {
      const history = utils.getByTestId('history').props.children as string;
      expect(history).toContain('agrega a ana@correo.com como agente');
      expect(history).toContain('Invitación guardada.');
    });
  });
});
