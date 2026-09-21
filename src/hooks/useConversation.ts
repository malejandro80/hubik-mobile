import { useContext, useMemo, useState } from 'react';
import { ChatMessage } from '../types/property';
import { ConversationContext, ConversationState } from './ConversationProvider';

export function useConversation(): ConversationState {
  const shared = useContext(ConversationContext);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  const local = useMemo<ConversationState>(
    () => ({
      messages: localMessages,
      setMessages: setLocalMessages,
      appendMessages: (...items: ChatMessage[]) => setLocalMessages((previous) => [...previous, ...items]),
      reset: () => setLocalMessages([]),
    }),
    [localMessages]
  );

  return shared ?? local;
}
