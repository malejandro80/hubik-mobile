export type AskTarget = { kind: 'listing'; id: string } | { kind: 'shared'; token: string };

export interface AskHistoryTurn {
  question: string;
  answer: string;
}

export interface AskRequest {
  question: string;
  target: AskTarget;
  history: AskHistoryTurn[];
}

export interface AskAnswer {
  answer: string;
  refused: boolean;
}

export type AskTurnStatus = 'pending' | 'done' | 'error';

export interface AskTurn {
  id: string;
  question: string;
  answer?: string;
  status: AskTurnStatus;
}
