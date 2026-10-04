export type AskTarget = { kind: 'listing'; id: string } | { kind: 'shared'; token: string };

export interface AskHistoryTurn {
  question: string;
  answer: string;
}

export interface AskRequest {
  question: string;
  target: AskTarget;
  history: AskHistoryTurn[];
  clarifications: AskHistoryTurn[];
}

export interface AskClarification {
  question: string;
  options: string[];
}

export type AskOutcome =
  | { type: 'answer'; answer: string; refused: boolean }
  | ({ type: 'clarify' } & AskClarification);

export type AskTurnStatus = 'pending' | 'done' | 'error' | 'clarify';

export interface AskTurn {
  id: string;
  question: string;
  status: AskTurnStatus;
  answer?: string;
  clarify?: AskClarification;
  clarifications: AskHistoryTurn[];
}
