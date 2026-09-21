import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AgencyCommand, parseAgencyCommand } from '../lib/agencyCommands';
import { AddAgentOutcome } from '../types/auth';
import { AgentsFeedback, useAgencyAgents } from './useAgencyAgents';
import { useLabels } from './useLabels';
import { useScreenChat } from './useScreenChat';

type AgencyAgents = ReturnType<typeof useAgencyAgents>;

export function useAgencyChat(agents: AgencyAgents) {
  const { auth, agencyChat } = useLabels();
  const router = useRouter();
  const copy = auth.agents;
  const { state, addAgentByEmail, cancelInvite } = agents;

  const describeFeedback = useCallback(
    (feedback: AgentsFeedback): string => {
      if (feedback === 'invalid_email') return copy.errors.invalid_email;
      if (feedback === 'error') return copy.errors.generic;
      if (feedback === 'cancel_error') return copy.errors.cancel;
      return copy.feedback[feedback as AddAgentOutcome];
    },
    [copy]
  );

  const describeTeam = useCallback(
    (command: AgencyCommand): string => {
      if (state.phase === 'loading') return agencyChat.teamLoading;
      if (state.phase === 'error') return copy.loadError;

      if (command.type === 'count_team') return agencyChat.teamCount(state.agents.length, state.invites.length);
      if (state.agents.length === 0 && state.invites.length === 0) return copy.emptyList;

      const parts: string[] = [];
      if (state.agents.length > 0) {
        parts.push(agencyChat.teamAgents(state.agents.map((agent) => agent.displayName?.trim() || copy.unnamedAgent)));
      }
      if (state.invites.length > 0) parts.push(agencyChat.teamInvites(state.invites.map((invite) => invite.email)));
      return parts.join(' ');
    },
    [state, agencyChat, copy]
  );

  const execute = useCallback(
    async (command: AgencyCommand): Promise<string> => {
      switch (command.type) {
        case 'add_agent_missing_email':
          return agencyChat.askEmail;
        case 'add_agent':
          return describeFeedback(await addAgentByEmail(command.email));
        case 'cancel_invite': {
          const invite = state.invites.find((item) => item.email.toLowerCase() === command.email);
          if (!invite) return agencyChat.inviteNotFound(command.email);
          const cancelled = await cancelInvite(invite.id);
          return cancelled ? agencyChat.inviteCancelled(command.email) : describeFeedback('cancel_error');
        }
        case 'count_team':
        case 'list_team':
          return describeTeam(command);
        case 'go_home':
          router.push('/');
          return agencyChat.goingHome;
      }
    },
    [agencyChat, describeFeedback, describeTeam, addAgentByEmail, cancelInvite, state.invites, router]
  );

  return useScreenChat<AgencyCommand>({ parse: parseAgencyCommand, execute, helpText: agencyChat.help });
}
