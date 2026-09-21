import React, { createContext, useCallback, useMemo, useState } from 'react';
import { ChatMessage } from '../types/property';
import { useAuth } from './useAuth';

export interface ConversationState {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  appendMessages: (...messages: ChatMessage[]) => void;
  reset: () => void;
}

export const ConversationContext = createContext<ConversationState | null>(null);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previousStatus, setPreviousStatus] = useState(status);

  if (status !== previousStatus) {
    setPreviousStatus(status);
    if (previousStatus === 'signedIn' && status === 'signedOut') setMessages([]);
  }

  const appendMessages = useCallback((...items: ChatMessage[]) => {
    setMessages((previous) => [...previous, ...items]);
  }, []);

  const reset = useCallback(() => setMessages([]), []);

  const value = useMemo<ConversationState>(
    () => ({ messages, setMessages, appendMessages, reset }),
    [messages, appendMessages, reset]
  );

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
};
