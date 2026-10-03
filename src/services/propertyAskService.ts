import { EDGE_FUNCTIONS } from '../constants/chatApi';
import { supabase } from '../lib/supabase';
import { AskOutcome, AskRequest } from '../types/propertyAsk';

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string');

function readOutcome(data: unknown): AskOutcome {
  const outcome = (data ?? {}) as Record<string, unknown>;
  if (outcome.type === 'answer' && typeof outcome.answer === 'string') {
    return { type: 'answer', answer: outcome.answer, refused: outcome.refused === true };
  }
  if (outcome.type === 'clarify' && typeof outcome.question === 'string' && isStringList(outcome.options)) {
    return { type: 'clarify', question: outcome.question, options: outcome.options };
  }
  throw new Error('Invalid response received from property-ask');
}

export async function askAboutProperty(request: AskRequest): Promise<AskOutcome> {
  const { data, error } = await supabase.functions.invoke<AskOutcome>(EDGE_FUNCTIONS.PROPERTY_ASK, { body: request });
  if (error) throw error;
  return readOutcome(data);
}
