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

  const ask = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || !target || pendingRef.current) return;

      const id = `${Date.now()}-${turnsRef.current.length}`;
      const history = historyOf(turnsRef.current);
      pendingRef.current = true;
      setPending(true);
      update([...turnsRef.current, { id, question, status: 'pending' }]);

      try {
        const { answer } = await askAboutProperty({ question, target, history });
        update(turnsRef.current.map((turn) => (turn.id === id ? { ...turn, answer, status: 'done' } : turn)));
      } catch {
        update(turnsRef.current.map((turn) => (turn.id === id ? { ...turn, status: 'error' } : turn)));
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [target, update]
  );

  return { turns, pending, ask };
}
