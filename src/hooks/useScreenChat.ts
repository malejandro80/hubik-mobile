import { useCallback, useState } from 'react';
import { generateMessageId } from '../lib/chatRegistration';
import { ChatMessage } from '../types/property';
import { useConversation } from './useConversation';
import { useLabels } from './useLabels';

export interface ScreenChatConfig<Command> {
  parse: (text: string) => Command | null;
  execute: (command: Command) => Promise<string> | string;
  helpText: string;
}

export function useScreenChat<Command>({ parse, execute, helpText }: ScreenChatConfig<Command>) {
  const { chat, screenChat } = useLabels();
  const { appendMessages } = useConversation();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastReply, setLastReply] = useState<string | null>(null);

  const send = useCallback(
    async (text?: string): Promise<void> => {
      const message = (text ?? inputText).trim();
      if (!message || loading) return;

      const question: ChatMessage = {
        id: generateMessageId('user'),
        sender: 'user',
        text: message,
        timestamp: chat.justNow,
      };
      appendMessages(question);
      setInputText('');

      const command = parse(message);
      let reply = helpText;
      if (command) {
        setLoading(true);
        try {
          reply = await execute(command);
        } catch {
          reply = screenChat.error;
        } finally {
          setLoading(false);
        }
      }

      appendMessages({
        id: generateMessageId('assistant'),
        sender: 'assistant',
        text: reply,
        timestamp: chat.justNow,
      });
      setLastReply(reply);
    },
    [inputText, loading, parse, execute, helpText, appendMessages, chat.justNow, screenChat.error]
  );

  return { inputText, setInputText, send, loading, lastReply };
}
