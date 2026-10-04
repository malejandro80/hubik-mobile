import { useCallback, useRef, useState } from 'react';
import { ASK_HISTORY_TURNS } from '../constants/propertyAsk';
import { askAboutProperty } from '../services/propertyAskService';
import { AskHistoryTurn, AskTarget, AskTurn } from '../types/propertyAsk';

const historyOf = (turns: AskTurn[]): AskHistoryTurn[] =>
  turns
    .filter((turn): turn is AskTurn & { answer: string } => turn.status === 'done' && typeof turn.answer === 'string')
    .slice(-ASK_HISTORY_TURNS)
    .map(({ question, answer }) => ({ question, answer }));

export function usePropertyAsk(target: AskTarget | null) {
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [pending, setPending] = useState(false);
  const turnsRef = useRef<AskTurn[]>([]);
  const pendingRef = useRef(false);

  const update = useCallback((next: AskTurn[]) => {
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<AskTurn>) =>
      update(turnsRef.current.map((turn) => (turn.id === id ? { ...turn, ...changes } : turn))),
    [update]
  );

  const send = useCallback(
    async (turn: AskTurn, history: AskHistoryTurn[]) => {
      if (!target) return;
      pendingRef.current = true;
      setPending(true);
      try {
        const outcome = await askAboutProperty({
          question: turn.question,
          target,
          history,
          clarifications: turn.clarifications,
        });
        if (outcome.type === 'clarify') {
          patch(turn.id, { status: 'clarify', clarify: { question: outcome.question, options: outcome.options } });
        } else {
          patch(turn.id, { status: 'done', answer: outcome.answer, clarify: undefined });
        }
      } catch {
        patch(turn.id, { status: 'error', clarify: undefined });
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [target, patch]
  );

  const ask = useCallback(
    async (text: string) => {
      const reply = text.trim();
      if (!reply || !target || pendingRef.current) return;

      const current = turnsRef.current;
      const waiting = current[current.length - 1];
      if (waiting?.status === 'clarify' && waiting.clarify) {
        const clarifications = [...waiting.clarifications, { question: waiting.clarify.question, answer: reply }];
        const resent = { ...waiting, status: 'pending' as const, clarify: undefined, clarifications };
        patch(waiting.id, resent);
        await send(resent, historyOf(current.slice(0, -1)));
        return;
      }

      const turn: AskTurn = { id: `${Date.now()}-${current.length}`, question: reply, status: 'pending', clarifications: [] };
      update([...current, turn]);
      await send(turn, historyOf(current));
    },
    [target, patch, send, update]
  );

  const clear = useCallback(() => {
    if (!pendingRef.current) update([]);
  }, [update]);

  return { turns, pending, ask, clear };
}
