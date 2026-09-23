import { useCallback, useState } from 'react';
import { ChatMessage } from '../types/property';

export function useNewReply(messages: ChatMessage[]) {
  const [presentAtMount] = useState(() => new Set(messages.map((message) => message.id)));
  const [written, setWritten] = useState<ReadonlySet<string>>(() => new Set());

  const last = messages[messages.length - 1];
  const writingId =
    last && last.sender === 'assistant' && !presentAtMount.has(last.id) && !written.has(last.id) ? last.id : null;

  const finishWriting = useCallback((id: string) => {
    setWritten((previous) => new Set(previous).add(id));
  }, []);

  return { writingId, finishWriting };
}
