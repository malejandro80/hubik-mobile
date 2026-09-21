import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AgentsSection } from '../AgentsSection';
import { useAgencyAgents } from '../../hooks/useAgencyAgents';
import * as authApi from '../../services/authApi';

jest.mock('../../services/authApi', () => ({
  addAgent: jest.fn(),
  cancelAgentInvite: jest.fn(),
  fetchAgencyAgents: jest.fn(),
  fetchAgentInvites: jest.fn(),
}));

const api = authApi as jest.Mocked<typeof authApi>;

const Harness = () => <AgentsSection agents={useAgencyAgents('a1')} />;

const renderSection = async () => {
  const utils = render(<Harness />);
  await waitFor(() => expect(utils.queryByLabelText('Correo del agente')).toBeTruthy());
  return utils;
};

const typeEmail = (utils: ReturnType<typeof render>, email: string) =>
  fireEvent.changeText(utils.getByLabelText('Correo del agente'), email);

describe('AgentsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.fetchAgencyAgents.mockResolvedValue([]);
    api.fetchAgentInvites.mockResolvedValue([]);
  });

  it('explains what it does and offers an email field and an add button', async () => {
    const utils = await renderSection();

    expect(utils.getByText('Agentes')).toBeTruthy();
    expect(utils.getByText(/en cuanto inicie sesión con ese correo/)).toBeTruthy();
    expect(utils.getByLabelText('Agregar')).toBeTruthy();
  });

  it('uses an email keyboard without auto capitalisation or correction', async () => {
    const utils = await renderSection();
    const input = utils.getByLabelText('Correo del agente');

    expect(input.props.keyboardType).toBe('email-address');
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.autoCorrect).toBe(false);
  });

  it('lists the agents and the pending invites', async () => {
    api.fetchAgencyAgents.mockResolvedValue([
      { userId: 'u1', displayName: 'Ana Pérez' },
      { userId: 'u2', displayName: null },
    ]);
    api.fetchAgentInvites.mockResolvedValue([{ id: 'i1', email: 'luis@correo.com', createdAt: '2026-09-21T10:00:00Z' }]);
    const utils = await renderSection();

    expect(await utils.findByText('Ana Pérez')).toBeTruthy();
    expect(utils.getByText('Agente sin nombre')).toBeTruthy();
    expect(utils.getAllByText('Agente')).toHaveLength(2);
    expect(utils.getByText('luis@correo.com')).toBeTruthy();
    expect(utils.getByText('Pendiente')).toBeTruthy();
  });

  it('says so when there are no agents yet', async () => {
    const utils = await renderSection();

    expect(await utils.findByText('Todavía no tiene agentes.')).toBeTruthy();
  });

  it('adds an email, confirms it and clears the field', async () => {
    api.addAgent.mockResolvedValue('invited');
    const utils = await renderSection();
    typeEmail(utils, 'luis@correo.com');

    fireEvent.press(utils.getByLabelText('Agregar'));

    expect(await utils.findByText('Invitación guardada. Será agente en cuanto inicie sesión con ese correo.')).toBeTruthy();
    expect(api.addAgent).toHaveBeenCalledWith('luis@correo.com');
    expect(utils.getByLabelText('Correo del agente').props.value).toBe('');
  });

  it('tells the owner when an existing client became an agent', async () => {
    api.addAgent.mockResolvedValue('agent_added');
    const utils = await renderSection();
    typeEmail(utils, 'ana@correo.com');

    fireEvent.press(utils.getByLabelText('Agregar'));

    expect(await utils.findByText('Listo. Esta persona ya es agente de su inmobiliaria.')).toBeTruthy();
  });

  it('shows only a neutral message for an email that cannot be added, and keeps the field', async () => {
    api.addAgent.mockResolvedValue('unavailable');
    const utils = await renderSection();
    typeEmail(utils, 'otro@correo.com');

    fireEvent.press(utils.getByLabelText('Agregar'));

    expect(await utils.findByText('Este correo no se puede agregar.')).toBeTruthy();
    expect(utils.getByLabelText('Correo del agente').props.value).toBe('otro@correo.com');
  });

  it('says when the email is already on the list', async () => {
    api.addAgent.mockResolvedValue('already_listed');
    const utils = await renderSection();
    typeEmail(utils, 'ana@correo.com');

    fireEvent.press(utils.getByLabelText('Agregar'));

    expect(await utils.findByText('Este correo ya está en su lista.')).toBeTruthy();
  });

  it('asks for a valid email without calling the server', async () => {
    const utils = await renderSection();
    typeEmail(utils, 'no-es-un-correo');

    fireEvent.press(utils.getByLabelText('Agregar'));

    expect(await utils.findByText('Escriba un correo válido, por ejemplo agente@correo.com.')).toBeTruthy();
    expect(api.addAgent).not.toHaveBeenCalled();
  });

  it('shows a generic message when the server call fails', async () => {
    api.addAgent.mockRejectedValue(new Error('offline'));
    const utils = await renderSection();
    typeEmail(utils, 'ana@correo.com');

    fireEvent.press(utils.getByLabelText('Agregar'));

    expect(await utils.findByText('No pudimos completar la acción. Inténtelo de nuevo.')).toBeTruthy();
  });

  it('shows progress and blocks a second tap while adding', async () => {
    let resolveAdd!: (value: 'invited') => void;
    api.addAgent.mockReturnValue(new Promise((resolve) => (resolveAdd = resolve)));
    const utils = await renderSection();
    typeEmail(utils, 'ana@correo.com');

    fireEvent.press(utils.getByLabelText('Agregar'));
    await waitFor(() => expect(utils.getByText('Agregando...')).toBeTruthy());
    fireEvent.press(utils.getByText('Agregando...'));

    expect(api.addAgent).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveAdd('invited');
    });
    expect(utils.queryByText('Agregando...')).toBeNull();
    expect(utils.getByLabelText('Agregar')).toBeTruthy();
  });

  it('cancels a pending invite', async () => {
    api.fetchAgentInvites.mockResolvedValue([{ id: 'i1', email: 'luis@correo.com', createdAt: '2026-09-21T10:00:00Z' }]);
    api.cancelAgentInvite.mockResolvedValue();
    const utils = await renderSection();

    fireEvent.press(await utils.findByLabelText('Cancelar la invitación de luis@correo.com'));

    await waitFor(() => expect(api.cancelAgentInvite).toHaveBeenCalledWith('i1'));
  });

  it('shows a load error with a retry', async () => {
    api.fetchAgencyAgents.mockRejectedValueOnce(new Error('offline'));
    const utils = render(<Harness />);

    expect(await utils.findByText('No pudimos cargar sus agentes.')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Reintentar'));

    await waitFor(() => expect(utils.queryByText('No pudimos cargar sus agentes.')).toBeNull());
  });
});
