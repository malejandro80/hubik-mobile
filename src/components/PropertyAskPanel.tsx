import React, { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { usePropertyAsk } from '../hooks/usePropertyAsk';
import { useVoiceNote } from '../hooks/useVoiceNote';
import { colors } from '../theme';
import { AskTarget } from '../types/propertyAsk';
import { ChatInputBar } from './ChatInputBar';
import { PropertyAskThread } from './PropertyAskThread';
import { getPropertyAskPanelStyles } from './PropertyAskPanel.styles';

export interface PropertyAskPanelProps {
  target: AskTarget | null;
}

export function PropertyAskPanel({ target }: PropertyAskPanelProps) {
  const router = useRouter();
  const { status } = useAuth();
  const { propertyAsk: askLabels } = useLabels();
  const theme = colors[useColorScheme()];
  const styles = useMemo(() => getPropertyAskPanelStyles(theme), [theme]);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(true);
  const { turns, pending, ask, clear } = usePropertyAsk(target);

  const askHere = useCallback(
    (question: string) => {
      setExpanded(true);
      void ask(question);
    },
    [ask]
  );
  const voice = useVoiceNote(askHere);

  const send = (text?: string) => {
    const question = (text ?? draft).trim();
    if (!question) return;
    setDraft('');
    askHere(question);
  };

  if (status !== 'signedIn') {
    return (
      <TouchableOpacity
        style={styles.signIn}
        onPress={() => router.push('/sign-in')}
        accessibilityRole="button"
        accessibilityLabel={askLabels.signInA11y}
      >
        <Text style={styles.signInText}>{askLabels.signInPrompt}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      {turns.length > 0 && expanded && (
        <>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={clear}
              disabled={pending}
              accessibilityRole="button"
              accessibilityLabel={askLabels.clearA11y}
              accessibilityState={{ disabled: pending }}
            >
              <Text style={styles.headerButtonText}>{askLabels.clear}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setExpanded(false)}
              accessibilityRole="button"
              accessibilityLabel={askLabels.hideA11y}
            >
              <Text style={styles.headerButtonText}>{askLabels.hide}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.thread}>
            <PropertyAskThread turns={turns} pending={pending} onChoose={askHere} />
          </View>
        </>
      )}
      {turns.length > 0 && !expanded && (
        <TouchableOpacity
          style={styles.reopen}
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel={askLabels.reopenA11y(turns.length)}
        >
          <Text style={styles.reopenText}>{askLabels.reopen(turns.length)}</Text>
        </TouchableOpacity>
      )}
      <ChatInputBar
        value={draft}
        onChangeText={setDraft}
        onSend={send}
        onMicPress={() => void voice.onMicPress()}
        isRecording={voice.isRecording}
        loading={voice.busy || pending}
      />
    </>
  );
}
