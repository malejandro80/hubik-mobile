import { supabase } from '../../lib/supabase';
import { askAboutProperty } from '../propertyAskService';

jest.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

const invoke = supabase.functions.invoke as jest.Mock;
const request = {
  question: '¿Qué tal la zona?',
  target: { kind: 'listing' as const, id: '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55' },
  history: [{ question: 'hola', answer: 'buenas' }],
  clarifications: [],
};

describe('askAboutProperty', () => {
  beforeEach(() => invoke.mockReset());

  it('sends the question, target, history and clarifications to the property-ask function', async () => {
    invoke.mockResolvedValue({ data: { type: 'answer', answer: 'Zona tranquila (estimación).', refused: false }, error: null });

    await expect(askAboutProperty(request)).resolves.toEqual({
      type: 'answer',
      answer: 'Zona tranquila (estimación).',
      refused: false,
    });
    expect(invoke).toHaveBeenCalledWith('property-ask', { body: request });
  });

  it('returns a clarification with its options', async () => {
    invoke.mockResolvedValue({
      data: { type: 'clarify', question: '¿Tu presupuesto?', options: ['Hasta 50.000 USD', 'Más de 50.000 USD'] },
      error: null,
    });

    await expect(askAboutProperty(request)).resolves.toEqual({
      type: 'clarify',
      question: '¿Tu presupuesto?',
      options: ['Hasta 50.000 USD', 'Más de 50.000 USD'],
    });
  });

  it('throws when the call fails or the outcome is malformed', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('401') });
    await expect(askAboutProperty(request)).rejects.toThrow('401');

    invoke.mockResolvedValue({ data: { type: 'answer', answer: 42 }, error: null });
    await expect(askAboutProperty(request)).rejects.toThrow();

    invoke.mockResolvedValue({ data: { type: 'clarify', question: '¿?', options: 'a' }, error: null });
    await expect(askAboutProperty(request)).rejects.toThrow();
  });
});
