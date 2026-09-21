import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { ConversationProvider } from '../ConversationProvider';
import { useAgencyChat } from '../useAgencyChat';
import { AgentsState } from '../useAgencyAgents';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../useAuth', () => ({
  useAuth: () => ({ status: 'signedIn' }),
}));

const readyState: AgentsState = {
  phase: 'ready',
  agents: [
    { userId: 'u1', displayName: 'Ana Pérez' },
    { userId: 'u2', displayName: null },
  ],
  invites: [{ id: 'i1', email: 'luis@correo.com', createdAt: '2026-09-21T10:00:00Z' }],
};

const buildAgents = (state: AgentsState = readyState) => ({
  state,
  adding: false,
  feedback: null,
  addByEmail: jest.fn(),
  addAgentByEmail: jest.fn(),
  addAgentById: jest.fn(),
  cancelInvite: jest.fn(),
  retry: jest.fn(),
});

const wrapper = ({ children }: { children: React.ReactNode }) => <ConversationProvider>{children}</ConversationProvider>;

const setup = (agents = buildAgents()) => {
  const hook = renderHook(() => useAgencyChat(agents), { wrapper });
  const say = async (text: string) => {
    await act(async () => {
      await hook.result.current.send(text);
    });
    return hook.result.current.lastReply;
  };
  return { agents, say, hook };
};

describe('useAgencyChat add agent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['agent_added', 'Listo. Esta persona ya es agente de su inmobiliaria.'],
    ['invited', 'Invitación guardada. Será agente en cuanto inicie sesión con ese correo.'],
    ['already_listed', 'Este correo ya está en su lista.'],
    ['unavailable', 'Este correo no se puede agregar.'],
    ['invalid_email', 'Escriba un correo válido, por ejemplo agente@correo.com.'],
    ['error', 'No pudimos completar la acción. Inténtelo de nuevo.'],
  ])('replies for the "%s" outcome exactly like the button', async (outcome, reply) => {
    const { agents, say } = setup();
    agents.addAgentByEmail.mockResolvedValue(outcome);

    expect(await say('agrega a ana@correo.com como agente')).toBe(reply);
    expect(agents.addAgentByEmail).toHaveBeenCalledWith('ana@correo.com');
  });

  it('asks for the email when none was given', async () => {
    const { agents, say } = setup();

    expect(await say('agrega un agente')).toBe('Escriba el correo del agente, por ejemplo: agrega a ana@correo.com como agente.');
    expect(agents.addAgentByEmail).not.toHaveBeenCalled();
  });
});

describe('useAgencyChat cancel invite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels the pending invite that matches the email, ignoring letter case', async () => {
    const { agents, say } = setup();
    agents.cancelInvite.mockResolvedValue(true);

    expect(await say('cancela la invitación de Luis@Correo.com')).toBe('Listo. Cancelé la invitación de luis@correo.com.');
    expect(agents.cancelInvite).toHaveBeenCalledWith('i1');
  });

  it('says so when there is no pending invite for that email', async () => {
    const { agents, say } = setup();

    expect(await say('cancela la invitación de otro@correo.com')).toBe('No encuentro una invitación pendiente para otro@correo.com.');
    expect(agents.cancelInvite).not.toHaveBeenCalled();
  });

  it('reports a failed cancellation', async () => {
    const { agents, say } = setup();
    agents.cancelInvite.mockResolvedValue(false);

    expect(await say('cancela la invitación de luis@correo.com')).toBe('No pudimos cancelar la invitación. Inténtelo de nuevo.');
  });
});

describe('useAgencyChat team questions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts agents and pending invites', async () => {
    const { say } = setup();

    expect(await say('¿cuántos agentes tengo?')).toBe('Tiene 2 agentes y 1 invitación pendiente.');
  });

  it('uses the singular forms', async () => {
    const { say } = setup(
      buildAgents({ phase: 'ready', agents: [{ userId: 'u1', displayName: 'Ana' }], invites: [] })
    );

    expect(await say('cuántos agentes hay')).toBe('Tiene 1 agente y 0 invitaciones pendientes.');
  });

  it('lists the agents and the pending invites', async () => {
    const { say } = setup();

    expect(await say('¿quiénes son mis agentes?')).toBe(
      'Sus agentes: Ana Pérez, Agente sin nombre. Invitaciones pendientes: luis@correo.com.'
    );
  });

  it('says there is nobody yet when the team is empty', async () => {
    const { say } = setup(buildAgents({ phase: 'ready', agents: [], invites: [] }));

    expect(await say('lista mis agentes')).toBe('Todavía no tiene agentes.');
  });

  it('says the team is still loading, or could not be loaded', async () => {
    expect(await setup(buildAgents({ phase: 'loading', agents: [], invites: [] })).say('cuántos agentes tengo')).toBe(
      'Todavía estoy cargando su equipo. Inténtelo en un momento.'
    );
    expect(await setup(buildAgents({ phase: 'error', agents: [], invites: [] })).say('cuántos agentes tengo')).toBe(
      'No pudimos cargar sus agentes.'
    );
  });
});

describe('useAgencyChat navigation and help', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the home chat', async () => {
    const { say } = setup();

    expect(await say('vuelve al inicio')).toBe('De acuerdo, vuelvo al inicio.');
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('explains what can be said and changes nothing when the message is not understood', async () => {
    const { agents, say } = setup();

    const reply = await say('hola');

    expect(reply).toContain('agrega a ana@correo.com como agente');
    expect(reply).toContain('cancela la invitación de luis@correo.com');
    expect(agents.addAgentByEmail).not.toHaveBeenCalled();
    expect(agents.cancelInvite).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
