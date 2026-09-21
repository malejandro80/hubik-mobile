import { useContext, useMemo, useState } from 'react';
import { INITIAL_MESSAGES } from '../lib/chatRegistration';
import { ChatMessage } from '../types/property';
import { ConversationContext, ConversationState } from './ConversationProvider';

export function useConversation(): ConversationState {
  const shared = useContext(ConversationContext);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  const local = useMemo<ConversationState>(
    () => ({
      messages: localMessages,
      setMessages: setLocalMessages,
      appendMessages: (...items: ChatMessage[]) => setLocalMessages((previous) => [...previous, ...items]),
      reset: () => setLocalMessages(INITIAL_MESSAGES),
    }),
    [localMessages]
  );

  return shared ?? local;
}
