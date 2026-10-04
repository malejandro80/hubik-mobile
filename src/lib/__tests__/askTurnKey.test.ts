import { resolveTurnStageKey } from '../askTurnKey';
import { AskTurn } from '../../types/propertyAsk';

describe('resolveTurnStageKey', () => {
  it('returns null for undefined turn', () => {
    expect(resolveTurnStageKey(undefined)).toBeNull();
  });

  it('returns null for pending turn', () => {
    const turn: AskTurn = {
      id: 't-1',
      question: '¿Qué tal la zona?',
      status: 'pending',
      clarifications: [],
    };
    expect(resolveTurnStageKey(turn)).toBeNull();
  });

  it('returns null for error turn', () => {
    const turn: AskTurn = {
      id: 't-1',
      question: '¿Qué tal la zona?',
      status: 'error',
      clarifications: [],
    };
    expect(resolveTurnStageKey(turn)).toBeNull();
  });

  it('returns done stage key when turn is done with an answer', () => {
    const turn: AskTurn = {
      id: 't-1',
      question: '¿Qué tal la zona?',
      status: 'done',
      answer: 'Es una zona tranquila.',
      clarifications: [],
    };
    expect(resolveTurnStageKey(turn)).toBe('t-1:done');
  });

  it('returns null when turn is done without an answer string', () => {
    const turn: AskTurn = {
      id: 't-1',
      question: '¿Qué tal la zona?',
      status: 'done',
      clarifications: [],
    };
    expect(resolveTurnStageKey(turn)).toBeNull();
  });

  it('returns clarify stage key when turn has clarification', () => {
    const turn: AskTurn = {
      id: 't-2',
      question: '¿Me conviene?',
      status: 'clarify',
      clarify: {
        question: '¿Para quién sería?',
        options: ['Familia', 'Pareja'],
      },
      clarifications: [],
    };
    expect(resolveTurnStageKey(turn)).toBe('t-2:clarify');
  });

  it('returns null when turn is clarify without clarification object', () => {
    const turn: AskTurn = {
      id: 't-2',
      question: '¿Me conviene?',
      status: 'clarify',
      clarifications: [],
    };
    expect(resolveTurnStageKey(turn)).toBeNull();
  });
});
