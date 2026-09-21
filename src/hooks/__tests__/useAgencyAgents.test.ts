import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAgencyAgents } from '../useAgencyAgents';
import * as authApi from '../../services/authApi';

jest.mock('../../services/authApi', () => ({
  addAgent: jest.fn(),
  cancelAgentInvite: jest.fn(),
  fetchAgencyAgents: jest.fn(),
  fetchAgentInvites: jest.fn(),
}));

const api = authApi as jest.Mocked<typeof authApi>;

const agent = { userId: 'u1', displayName: 'Ana' };
const invite = { id: 'i1', email: 'luis@correo.com', createdAt: '2026-09-21T10:00:00Z' };

const renderAgents = async () => {
  const hook = renderHook(() => useAgencyAgents('a1'));
  await waitFor(() => expect(hook.result.current.state.phase).not.toBe('loading'));
  return hook;
};

describe('useAgencyAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.fetchAgencyAgents.mockResolvedValue([agent]);
    api.fetchAgentInvites.mockResolvedValue([invite]);
  });

  it('starts loading, then exposes the agents and pending invites of the agency', async () => {
    const { result } = renderHook(() => useAgencyAgents('a1'));
    expect(result.current.state.phase).toBe('loading');

    await waitFor(() => expect(result.current.state.phase).toBe('ready'));

    expect(api.fetchAgencyAgents).toHaveBeenCalledWith('a1');
    expect(api.fetchAgentInvites).toHaveBeenCalledWith('a1');
    expect(result.current.state.agents).toEqual([agent]);
    expect(result.current.state.invites).toEqual([invite]);
  });

  it('does not query anything while there is no agency id yet', async () => {
    const { result } = renderHook(() => useAgencyAgents(null));
    await act(async () => undefined);

    expect(api.fetchAgencyAgents).not.toHaveBeenCalled();
    expect(api.fetchAgentInvites).not.toHaveBeenCalled();
    expect(result.current.state.phase).toBe('loading');
  });

  it('reports an error and lets the owner retry', async () => {
    api.fetchAgencyAgents.mockRejectedValueOnce(new Error('offline'));
    const { result } = await renderAgents();
    expect(result.current.state.phase).toBe('error');

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.state.phase).toBe('ready'));
    expect(result.current.state.agents).toEqual([agent]);
  });

  it('rejects a malformed email without calling the server', async () => {
    const { result } = await renderAgents();

    let cleared = true;
    await act(async () => {
      cleared = await result.current.addByEmail('not-an-email');
    });

    expect(cleared).toBe(false);
    expect(result.current.feedback).toBe('invalid_email');
    expect(api.addAgent).not.toHaveBeenCalled();
  });

  it.each(['agent_added', 'invited'] as const)('after "%s" it reloads the list and asks to clear the field', async (outcome) => {
    api.addAgent.mockResolvedValue(outcome);
    const { result } = await renderAgents();
    api.fetchAgentInvites.mockClear();

    let cleared = false;
    await act(async () => {
      cleared = await result.current.addByEmail('ana@correo.com');
    });

    expect(cleared).toBe(true);
    expect(result.current.feedback).toBe(outcome);
    expect(api.addAgent).toHaveBeenCalledWith('ana@correo.com');
    await waitFor(() => expect(api.fetchAgentInvites).toHaveBeenCalledTimes(1));
  });

  it.each(['already_listed', 'unavailable'] as const)('after "%s" it keeps the field and does not reload', async (outcome) => {
    api.addAgent.mockResolvedValue(outcome);
    const { result } = await renderAgents();
    api.fetchAgentInvites.mockClear();

    let cleared = true;
    await act(async () => {
      cleared = await result.current.addByEmail('ana@correo.com');
    });

    expect(cleared).toBe(false);
    expect(result.current.feedback).toBe(outcome);
    expect(api.fetchAgentInvites).not.toHaveBeenCalled();
  });

  it('shows a generic error and keeps the list when the server call fails', async () => {
    api.addAgent.mockRejectedValue(new Error('offline'));
    const { result } = await renderAgents();

    await act(async () => {
      await result.current.addByEmail('ana@correo.com');
    });

    expect(result.current.feedback).toBe('error');
    expect(result.current.state.agents).toEqual([agent]);
  });

  it('marks the request as in progress while it runs', async () => {
    let resolveAdd!: (value: 'invited') => void;
    api.addAgent.mockReturnValue(new Promise((resolve) => (resolveAdd = resolve)));
    const { result } = await renderAgents();

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.addByEmail('ana@correo.com');
    });
    expect(result.current.adding).toBe(true);

    await act(async () => {
      resolveAdd('invited');
      await pending;
    });
    expect(result.current.adding).toBe(false);
  });

  it('clears the previous message when a new attempt starts', async () => {
    api.addAgent.mockResolvedValueOnce('unavailable').mockResolvedValueOnce('invited');
    const { result } = await renderAgents();
    await act(async () => {
      await result.current.addByEmail('a@correo.com');
    });
    expect(result.current.feedback).toBe('unavailable');

    await act(async () => {
      await result.current.addByEmail('b@correo.com');
    });

    expect(result.current.feedback).toBe('invited');
  });

  it('cancels a pending invite and reloads the list', async () => {
    api.cancelAgentInvite.mockResolvedValue();
    const { result } = await renderAgents();
    api.fetchAgentInvites.mockClear();

    await act(async () => {
      await result.current.cancelInvite('i1');
    });

    expect(api.cancelAgentInvite).toHaveBeenCalledWith('i1');
    await waitFor(() => expect(api.fetchAgentInvites).toHaveBeenCalledTimes(1));
    expect(result.current.feedback).toBeNull();
  });

  it('shows a message when cancelling fails', async () => {
    api.cancelAgentInvite.mockRejectedValue(new Error('offline'));
    const { result } = await renderAgents();

    await act(async () => {
      await result.current.cancelInvite('i1');
    });

    expect(result.current.feedback).toBe('cancel_error');
  });

  describe('results for callers that need the outcome', () => {
    it.each(['agent_added', 'invited', 'already_listed', 'unavailable'] as const)(
      'addAgentByEmail() returns "%s"',
      async (outcome) => {
        api.addAgent.mockResolvedValue(outcome);
        const { result } = await renderAgents();

        let returned: string | undefined;
        await act(async () => {
          returned = await result.current.addAgentByEmail('ana@correo.com');
        });

        expect(returned).toBe(outcome);
        expect(result.current.feedback).toBe(outcome);
      }
    );

    it('addAgentByEmail() returns invalid_email without calling the server, and error when the call fails', async () => {
      api.addAgent.mockRejectedValue(new Error('offline'));
      const { result } = await renderAgents();

      let invalid: string | undefined;
      let failed: string | undefined;
      await act(async () => {
        invalid = await result.current.addAgentByEmail('nope');
        failed = await result.current.addAgentByEmail('ana@correo.com');
      });

      expect(invalid).toBe('invalid_email');
      expect(failed).toBe('error');
      expect(api.addAgent).toHaveBeenCalledTimes(1);
    });

    it('cancelInvite() returns true on success and false on failure', async () => {
      api.cancelAgentInvite.mockResolvedValueOnce().mockRejectedValueOnce(new Error('offline'));
      const { result } = await renderAgents();

      let first: boolean | undefined;
      let second: boolean | undefined;
      await act(async () => {
        first = await result.current.cancelInvite('i1');
        second = await result.current.cancelInvite('i1');
      });

      expect(first).toBe(true);
      expect(second).toBe(false);
    });
  });
});
