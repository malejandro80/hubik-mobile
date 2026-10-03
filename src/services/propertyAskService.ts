import { EDGE_FUNCTIONS } from '../constants/chatApi';
import { supabase } from '../lib/supabase';
import { AskAnswer, AskRequest } from '../types/propertyAsk';

export async function askAboutProperty(request: AskRequest): Promise<AskAnswer> {
  const { data, error } = await supabase.functions.invoke<AskAnswer>(EDGE_FUNCTIONS.PROPERTY_ASK, { body: request });
  if (error) throw error;
  if (!data || typeof data.answer !== 'string') throw new Error('Invalid response received from property-ask');
  return { answer: data.answer, refused: data.refused === true };
}
