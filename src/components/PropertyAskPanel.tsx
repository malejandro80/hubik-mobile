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
  const { turns, pending, ask } = usePropertyAsk(target);

  const askHere = useCallback((question: string) => void ask(question), [ask]);
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
      <View style={styles.thread}>
        <PropertyAskThread turns={turns} pending={pending} onChoose={askHere} />
      </View>
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
