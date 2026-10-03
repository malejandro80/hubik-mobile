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
};

describe('askAboutProperty', () => {
  beforeEach(() => invoke.mockReset());

  it('sends the question, target and history to the property-ask function', async () => {
    invoke.mockResolvedValue({ data: { answer: 'Zona tranquila (estimación).', refused: false }, error: null });

    await expect(askAboutProperty(request)).resolves.toEqual({ answer: 'Zona tranquila (estimación).', refused: false });
    expect(invoke).toHaveBeenCalledWith('property-ask', { body: request });
  });

  it('throws when the call fails or the answer is malformed', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('401') });
    await expect(askAboutProperty(request)).rejects.toThrow('401');

    invoke.mockResolvedValue({ data: { answer: 42 }, error: null });
    await expect(askAboutProperty(request)).rejects.toThrow();
  });
});
