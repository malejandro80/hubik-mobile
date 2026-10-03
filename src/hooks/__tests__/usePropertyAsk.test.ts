import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePropertyAsk } from '../usePropertyAsk';
import { askAboutProperty } from '../../services/propertyAskService';

jest.mock('../../services/propertyAskService', () => ({
  askAboutProperty: jest.fn(),
}));

const askMock = askAboutProperty as jest.Mock;
const TARGET = { kind: 'listing' as const, id: '3f2b1c9e-8a44-4d0e-9a51-7c6d2e1b0a55' };
const answer = (text: string) => ({ type: 'answer', answer: text, refused: false });

describe('usePropertyAsk', () => {
  beforeEach(() => askMock.mockReset());

  it('shows the question as pending, then its answer', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    askMock.mockReturnValue(new Promise((done) => (resolve = done)));
    const { result } = renderHook(() => usePropertyAsk(TARGET));

    act(() => {
      void result.current.ask('¿Qué tal la zona?');
    });
    expect(result.current.turns).toEqual([expect.objectContaining({ question: '¿Qué tal la zona?', status: 'pending' })]);
    expect(result.current.pending).toBe(true);

    await act(async () => resolve(answer('Tranquila (estimación).')));
    expect(result.current.turns[0]).toEqual(expect.objectContaining({ answer: 'Tranquila (estimación).', status: 'done' }));
    expect(result.current.pending).toBe(false);
  });

  it('sends the previous answered turns as history, up to four', async () => {
    askMock.mockImplementation(async ({ question }: { question: string }) => answer(`r-${question}`));
    const { result } = renderHook(() => usePropertyAsk(TARGET));

    for (const question of ['a', 'b', 'c', 'd', 'e', 'f']) {
      await act(async () => result.current.ask(question));
    }

    const lastCall = askMock.mock.calls[askMock.mock.calls.length - 1][0];
    expect(lastCall).toEqual({
      question: 'f',
      target: TARGET,
      clarifications: [],
      history: [
        { question: 'b', answer: 'r-b' },
        { question: 'c', answer: 'r-c' },
        { question: 'd', answer: 'r-d' },
        { question: 'e', answer: 'r-e' },
      ],
    });
  });

  it('asks back with predefined options and resends the question with the chosen answer', async () => {
    askMock
      .mockResolvedValueOnce({ type: 'clarify', question: '¿Tu presupuesto?', options: ['Hasta 50.000 USD', 'Más de 50.000 USD'] })
      .mockResolvedValueOnce(answer('Te conviene porque…'));
    const { result } = renderHook(() => usePropertyAsk(TARGET));

    await act(async () => result.current.ask('¿Me conviene?'));
    expect(result.current.turns[0]).toEqual(
      expect.objectContaining({
        status: 'clarify',
        clarify: { question: '¿Tu presupuesto?', options: ['Hasta 50.000 USD', 'Más de 50.000 USD'] },
      })
    );

    await act(async () => result.current.ask('Hasta 50.000 USD'));

    expect(askMock).toHaveBeenLastCalledWith({
      question: '¿Me conviene?',
      target: TARGET,
      history: [],
      clarifications: [{ question: '¿Tu presupuesto?', answer: 'Hasta 50.000 USD' }],
    });
    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0]).toEqual(expect.objectContaining({ status: 'done', answer: 'Te conviene porque…' }));
  });

  it('marks the turn as failed when the question cannot be answered', async () => {
    askMock.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => usePropertyAsk(TARGET));

    await act(async () => result.current.ask('¿Y el tráfico?'));

    await waitFor(() => expect(result.current.turns[0].status).toBe('error'));
    expect(result.current.pending).toBe(false);
  });

  it('ignores empty questions, questions while one is pending, and a missing target', async () => {
    askMock.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => usePropertyAsk(TARGET));

    act(() => {
      void result.current.ask('   ');
    });
    act(() => {
      void result.current.ask('una');
    });
    act(() => {
      void result.current.ask('otra');
    });
    expect(askMock).toHaveBeenCalledTimes(1);

    const noTarget = renderHook(() => usePropertyAsk(null));
    act(() => {
      void noTarget.result.current.ask('hola');
    });
    expect(noTarget.result.current.turns).toEqual([]);
  });
});
