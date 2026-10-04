import { AskTurn } from '../types/propertyAsk';

export function resolveTurnStageKey(turn: AskTurn | undefined): string | null {
  if (!turn) return null;
  if (turn.status === 'done' && typeof turn.answer === 'string') {
    return `${turn.id}:done`;
  }
  if (turn.status === 'clarify' && turn.clarify) {
    return `${turn.id}:clarify`;
  }
  return null;
}
