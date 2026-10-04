import { useCallback, useState } from 'react';
import { resolveTurnStageKey } from '../lib/askTurnKey';
import { AskTurn } from '../types/propertyAsk';

const collectStageKeys = (turns: AskTurn[]): Set<string> => {
  const keys = new Set<string>();
  for (const turn of turns) {
    const key = resolveTurnStageKey(turn);
    if (key) keys.add(key);
  }
  return keys;
};

export function useNewAskTurn(turns: AskTurn[]) {
  const [presentAtMount] = useState(() => collectStageKeys(turns));
  const [written, setWritten] = useState<ReadonlySet<string>>(() => new Set());

  const last = turns[turns.length - 1];
  const lastKey = resolveTurnStageKey(last);
  const writingStageKey =
    lastKey && !presentAtMount.has(lastKey) && !written.has(lastKey) ? lastKey : null;

  const finishWriting = useCallback((stageKey: string) => {
    setWritten((previous) => new Set(previous).add(stageKey));
  }, []);

  return { writingStageKey, finishWriting };
}
