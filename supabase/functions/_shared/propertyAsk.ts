import { normalizePlace } from './cityMatch.ts';
import {
  ASK_REFUSAL,
  COMPARABLE_FACT_FIELDS,
  EMAIL_PATTERN,
  LISTING_FACT_FIELDS,
  LISTING_ID_PATTERN,
  LISTING_TOKEN_PATTERN,
  MAX_ANSWER_LENGTH,
  MAX_CLARIFICATION_ROUNDS,
  MAX_CLARIFICATION_TEXT_LENGTH,
  MAX_CLARIFY_OPTION_LENGTH,
  MAX_CLARIFY_OPTIONS,
  MAX_COMPARABLES,
  MAX_HISTORY_ANSWER_LENGTH,
  MAX_HISTORY_TURNS,
  MAX_QUESTION_LENGTH,
  MIN_CLARIFY_OPTIONS,
  PHONE_PATTERN,
  SECRET_PATTERN,
  SENSITIVE_TOPIC_PATTERNS,
  THREAT_PATTERNS,
  URL_PATTERN,
} from './propertyAskConstants.ts';

type Row = Record<string, unknown>;

export type AskTarget = { kind: 'listing'; id: string } | { kind: 'shared'; token: string };

export interface AskTurn {
  question: string;
  answer: string;
}

export interface AskRequest {
  question: string;
  target: AskTarget;
  history: AskTurn[];
  clarifications: AskTurn[];
}

export type SensitiveTopic = (typeof SENSITIVE_TOPIC_PATTERNS)[number][0];

export type ThreatCategory = (typeof THREAT_PATTERNS)[number][0];

export type AskOutcome =
  | { type: 'answer'; answer: string; refused: boolean }
  | { type: 'clarify'; question: string; options: string[] };

export interface ScreenedAnswer {
  answer: string;
  refused: boolean;
}

const asRecord = (value: unknown): Row | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : null;

const cleanText = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
};

function parseTarget(value: unknown): AskTarget | null {
  const target = asRecord(value);
  if (target?.kind === 'listing' && typeof target.id === 'string' && LISTING_ID_PATTERN.test(target.id)) {
    return { kind: 'listing', id: target.id };
  }
  if (target?.kind === 'shared' && typeof target.token === 'string' && LISTING_TOKEN_PATTERN.test(target.token)) {
    return { kind: 'shared', token: target.token };
  }
  return null;
}

function parseTurns(value: unknown, answerMax: number): AskTurn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const turn = asRecord(item);
    const question = cleanText(turn?.question, MAX_QUESTION_LENGTH);
    const answer = cleanText(turn?.answer, answerMax);
    return question && answer ? [{ question, answer }] : [];
  });
}

export function parseAskRequest(body: unknown): AskRequest | null {
  const request = asRecord(body);
  const question = cleanText(request?.question, MAX_QUESTION_LENGTH);
  const target = parseTarget(request?.target);
  if (!question || !target) return null;
  return {
    question,
    target,
    history: parseTurns(request?.history, MAX_HISTORY_ANSWER_LENGTH).slice(-MAX_HISTORY_TURNS),
    clarifications: parseTurns(request?.clarifications, MAX_CLARIFICATION_TEXT_LENGTH).slice(0, MAX_CLARIFICATION_ROUNDS),
  };
}

export function threatCategory(texts: string[]): ThreatCategory | null {
  for (const text of texts) {
    const normalized = normalizePlace(text);
    const hit = THREAT_PATTERNS.find(([, pattern]) => pattern.test(normalized));
    if (hit) return hit[0];
  }
  return null;
}

export function sensitiveTopic(question: string): SensitiveTopic | null {
  const text = normalizePlace(question);
  return SENSITIVE_TOPIC_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

const pick = (row: Row, fields: readonly string[]): Row =>
  Object.fromEntries(fields.filter((field) => row[field] !== undefined && row[field] !== null).map((field) => [field, row[field]]));

export function listingFacts(row: Row): Row {
  return pick(row, LISTING_FACT_FIELDS);
}

export function comparableFacts(rows: Row[], self: { id?: string; title?: unknown; price?: unknown }): Row[] {
  return rows
    .filter((row) => (self.id ? row.id !== self.id : !(row.title === self.title && row.price === self.price)))
    .slice(0, MAX_COMPARABLES)
    .map((row) => {
      const facts = pick(row, COMPARABLE_FACT_FIELDS);
      const price = Number(row.price);
      const size = Number(row.square_meters);
      return size > 0 && Number.isFinite(price) ? { ...facts, price_per_m2: Math.round((price / size) * 100) / 100 } : facts;
    });
}

export function buildAskPrompt(input: {
  question: string;
  listing: Row;
  comparables: Row[];
  history: AskTurn[];
  clarifications: AskTurn[];
  mustAnswer: boolean;
}): string {
  const data = JSON.stringify({
    listing: input.listing,
    comparables: input.comparables,
    history: input.history,
    clarifications: input.clarifications,
    must_answer: input.mustAnswer,
  });
  return `DATA:\n${data}\n\nUSER_QUESTION:\n${input.question}`;
}

const leaks = (text: string): boolean =>
  PHONE_PATTERN.test(text) || EMAIL_PATTERN.test(text) || URL_PATTERN.test(text) || SECRET_PATTERN.test(text);

export function screenAnswer(text: unknown): ScreenedAnswer | null {
  if (typeof text !== 'string') return null;
  const answer = text.trim();
  if (!answer) return null;
  if (leaks(answer)) return { answer: ASK_REFUSAL, refused: true };
  return { answer: answer.slice(0, MAX_ANSWER_LENGTH), refused: false };
}

function parseClarification(output: Row): AskOutcome | null {
  const question = cleanText(output.question, MAX_CLARIFICATION_TEXT_LENGTH);
  const options = Array.isArray(output.options)
    ? output.options
        .map((option) => cleanText(option, MAX_CLARIFY_OPTION_LENGTH))
        .filter((option): option is string => option !== null)
        .slice(0, MAX_CLARIFY_OPTIONS)
    : [];
  if (!question || options.length < MIN_CLARIFY_OPTIONS || [question, ...options].some(leaks)) return null;
  return { type: 'clarify', question, options };
}

export function parseAskOutcome(raw: string, mustAnswer: boolean): AskOutcome | null {
  let output: Row | null;
  try {
    output = asRecord(JSON.parse(raw));
  } catch {
    return null;
  }
  if (output?.type === 'answer') {
    const screened = screenAnswer(output.answer);
    return screened ? { type: 'answer', ...screened } : null;
  }
  if (output?.type === 'clarify' && !mustAnswer) return parseClarification(output);
  return null;
}

