import { useCallback, useEffect, useState } from 'react';
import { isValidInviteEmail } from '../lib/agentInvites';
import { addAgent, cancelAgentInvite, fetchAgencyAgents, fetchAgentInvites } from '../services/authApi';
import { AddAgentOutcome, AgencyAgent, AgentInvite } from '../types/auth';

export type AgentsFeedback = AddAgentOutcome | 'invalid_email' | 'error' | 'cancel_error';

export interface AgentsState {
  phase: 'loading' | 'ready' | 'error';
  agents: AgencyAgent[];
  invites: AgentInvite[];
}

const INITIAL_STATE: AgentsState = { phase: 'loading', agents: [], invites: [] };

const SUCCESS_OUTCOMES: AddAgentOutcome[] = ['agent_added', 'invited'];

export function useAgencyAgents(agencyId: string | null) {
  const [state, setState] = useState<AgentsState>(INITIAL_STATE);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<AgentsFeedback | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!agencyId) return;
    let active = true;

    Promise.all([fetchAgencyAgents(agencyId), fetchAgentInvites(agencyId)])
      .then(([agents, invites]) => {
        if (active) setState({ phase: 'ready', agents, invites });
      })
      .catch(() => {
        if (active) setState((previous) => ({ ...previous, phase: 'error' }));
      });

    return () => {
      active = false;
    };
  }, [agencyId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const retry = useCallback(() => {
    setState((previous) => ({ ...previous, phase: 'loading' }));
    reload();
  }, [reload]);

  const addAgentByEmail = useCallback(
    async (raw: string): Promise<AgentsFeedback> => {
      setFeedback(null);
      if (!isValidInviteEmail(raw)) {
        setFeedback('invalid_email');
        return 'invalid_email';
      }

      setAdding(true);
      try {
        const outcome = await addAgent(raw);
        setFeedback(outcome);
        if (SUCCESS_OUTCOMES.includes(outcome)) reload();
        return outcome;
      } catch {
        setFeedback('error');
        return 'error';
      } finally {
        setAdding(false);
      }
    },
    [reload]
  );

  const addByEmail = useCallback(
    async (raw: string): Promise<boolean> => {
      const result = await addAgentByEmail(raw);
      return SUCCESS_OUTCOMES.includes(result as AddAgentOutcome);
    },
    [addAgentByEmail]
  );

  const cancelInvite = useCallback(
    async (inviteId: string): Promise<boolean> => {
      setFeedback(null);
      try {
        await cancelAgentInvite(inviteId);
        reload();
        return true;
      } catch {
        setFeedback('cancel_error');
        return false;
      }
    },
    [reload]
  );

  return { state, adding, feedback, addByEmail, addAgentByEmail, cancelInvite, retry };
}
