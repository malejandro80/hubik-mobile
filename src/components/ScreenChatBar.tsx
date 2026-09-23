import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { useLabels } from '../hooks/useLabels';
import { useScreenChat } from '../hooks/useScreenChat';
import { useVoiceNote } from '../hooks/useVoiceNote';
import { colors, hitSlop } from '../theme';
import { ChatInputBar } from './ChatInputBar';
import { getScreenChatBarStyles } from './ScreenChatBar.styles';

type ScreenChat = Pick<ReturnType<typeof useScreenChat>, 'inputText' | 'setInputText' | 'send' | 'loading' | 'lastReply'>;

export interface ScreenChatBarProps {
  chat: ScreenChat;
  onOpenConversation: () => void;
}

export const ScreenChatBar: React.FC<ScreenChatBarProps> = ({ chat, onOpenConversation }) => {
  const { screenChat } = useLabels();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => getScreenChatBarStyles(colors[colorScheme]), [colorScheme]);
  const { send } = chat;
  const voice = useVoiceNote(useCallback((text: string) => void send(text), [send]));

  return (
    <View>
      {chat.lastReply && (
        <View style={styles.replyStrip} accessibilityLiveRegion="polite">
          <Text style={styles.replyText} numberOfLines={3} accessibilityLabel={screenChat.lastReplyA11y(chat.lastReply)}>
            {chat.lastReply}
          </Text>
          <TouchableOpacity
            style={styles.openButton}
            onPress={onOpenConversation}
            accessibilityRole="button"
            accessibilityLabel={screenChat.viewConversationA11y}
            hitSlop={hitSlop.compact}
          >
            <Text style={styles.openText}>{screenChat.viewConversation}</Text>
          </TouchableOpacity>
        </View>
      )}
      <ChatInputBar
        value={chat.inputText}
        onChangeText={chat.setInputText}
        onSend={(text) => void chat.send(text)}
        onMicPress={() => void voice.onMicPress()}
        isRecording={voice.isRecording}
        loading={chat.loading || voice.busy}
      />
    </View>
  );
};
