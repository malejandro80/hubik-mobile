import { useEffect, useRef } from 'react';
import { MAX_ASK_LENGTH } from '../constants/chatRoute';
import { REGISTER_COMMAND } from '../lib/chatRegistration';

export type ChatRouteParams = {
  startRegistration?: string;
  ask?: string;
  askAt?: string;
};

export function useChatRouteParams(params: ChatRouteParams, send: (text: string) => void): void {
  const startedRegistration = useRef(false);
  const handledAskAt = useRef<string | null>(null);

  useEffect(() => {
    if (!params.startRegistration || startedRegistration.current) return;
    startedRegistration.current = true;
    send(REGISTER_COMMAND);
  }, [params.startRegistration, send]);

  const { ask, askAt } = params;

  useEffect(() => {
    if (typeof ask !== 'string' || !askAt || handledAskAt.current === askAt) return;
    handledAskAt.current = askAt;
    const question = ask.trim();
    if (question && question.length <= MAX_ASK_LENGTH) send(question);
  }, [ask, askAt, send]);
}
