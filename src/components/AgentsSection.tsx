import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AgentsFeedback, useAgencyAgents } from '../hooks/useAgencyAgents';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { colors, hitSlop } from '../theme/colors';
import { AddAgentOutcome, AgencyAgent, AgentInvite } from '../types/auth';
import { getAgentsSectionStyles } from './AgentsSection.styles';
import { Button } from './Button';

export interface AgentsSectionProps {
  agents: ReturnType<typeof useAgencyAgents>;
}

type Row =
  | { type: 'agent'; key: string; agent: AgencyAgent }
  | { type: 'invite'; key: string; invite: AgentInvite };

const SUCCESS_FEEDBACK: AgentsFeedback[] = ['agent_added', 'invited'];
const ERROR_FEEDBACK: AgentsFeedback[] = ['invalid_email', 'error', 'cancel_error'];

const keyExtractor = (row: Row) => row.key;

export const AgentsSection: React.FC<AgentsSectionProps> = ({ agents }) => {
  const { auth } = useLabels();
  const copy = auth.agents;
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getAgentsSectionStyles(colors[colorScheme]), [colorScheme]);
  const { state, adding, feedback, addByEmail, cancelInvite, retry } = agents;
  const [email, setEmail] = useState('');

  const rows = useMemo<Row[]>(
    () => [
      ...state.agents.map((agent): Row => ({ type: 'agent', key: `agent-${agent.userId}`, agent })),
      ...state.invites.map((invite): Row => ({ type: 'invite', key: `invite-${invite.id}`, invite })),
    ],
    [state.agents, state.invites]
  );

  const handleAdd = async () => {
    if (await addByEmail(email)) setEmail('');
  };

  const getFeedbackText = (value: AgentsFeedback): string => {
    if (value === 'invalid_email') return copy.errors.invalid_email;
    if (value === 'error') return copy.errors.generic;
    if (value === 'cancel_error') return copy.errors.cancel;
    return copy.feedback[value as AddAgentOutcome];
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === 'agent') {
      const name = item.agent.displayName?.trim() || copy.unnamedAgent;
      return (
        <View style={styles.row} accessible accessibilityLabel={copy.agentRowA11y(name)}>
          <Text style={styles.rowMain}>{name}</Text>
          <Text style={styles.rowTag}>{copy.agentRole}</Text>
        </View>
      );
    }

    return (
      <View style={styles.row}>
        <Text style={styles.rowMain} accessibilityLabel={copy.inviteRowA11y(item.invite.email)}>
          {item.invite.email}
        </Text>
        <Text style={[styles.rowTag, styles.rowTagPending]}>{copy.pending}</Text>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => void cancelInvite(item.invite.id)}
          accessibilityRole="button"
          accessibilityLabel={copy.cancelInviteA11y(item.invite.email)}
          hitSlop={hitSlop.compact}
        >
          <Text style={styles.cancelText}>{copy.cancelInvite}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {copy.sectionTitle}
      </Text>
      <Text style={styles.subtitle}>{copy.sectionSubtitle}</Text>

      <Text style={styles.fieldLabel}>{copy.emailLabel}</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder={copy.emailPlaceholder}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleAdd}
        editable={!adding}
        accessibilityLabel={copy.emailLabel}
      />
      <Button
        testID="agents-add"
        title={adding ? copy.addingButton : copy.addButton}
        onPress={handleAdd}
        disabled={adding}
      />

      {feedback && (
        <Text
          style={[
            styles.feedback,
            SUCCESS_FEEDBACK.includes(feedback) && styles.feedbackSuccess,
            ERROR_FEEDBACK.includes(feedback) && styles.feedbackError,
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {getFeedbackText(feedback)}
        </Text>
      )}

      <Text style={styles.listTitle}>{copy.listTitle}</Text>
      {state.phase === 'loading' && rows.length === 0 && <ActivityIndicator />}
      {state.phase === 'error' && (
        <>
          <Text style={styles.muted}>{copy.loadError}</Text>
          <Button testID="agents-retry" title={auth.retry} onPress={retry} variant="secondary" />
        </>
      )}
      {state.phase === 'ready' && rows.length === 0 && <Text style={styles.muted}>{copy.emptyList}</Text>}
      <FlatList data={rows} keyExtractor={keyExtractor} renderItem={renderRow} scrollEnabled={false} />
    </View>
  );
};
