import { act, renderHook } from '@testing-library/react-native';
import { useNewAskTurn } from '../useNewAskTurn';
import { AskTurn } from '../../types/propertyAsk';

const buildTurn = (
  id: string,
  status: AskTurn['status'],
  answer?: string,
  clarify?: AskTurn['clarify']
): AskTurn => ({
  id,
  question: `Pregunta ${id}`,
  status,
  answer,
  clarify,
  clarifications: [],
});

describe('useNewAskTurn', () => {
  it('never animates turns that were already present when the component mounted', () => {
    const existing = [
      buildTurn('t0', 'done', 'Respuesta inicial'),
      buildTurn('t1', 'clarify', undefined, { question: '¿Para vivir?', options: ['Sí', 'No'] }),
    ];
    const { result } = renderHook(() => useNewAskTurn(existing));

    expect(result.current.writingStageKey).toBeNull();
  });

  it('animates a new done turn that arrives later, until finished writing', () => {
    const { result, rerender } = renderHook(({ turns }) => useNewAskTurn(turns), {
      initialProps: { turns: [] as AskTurn[] },
    });

    rerender({ turns: [buildTurn('t1', 'pending')] });
    expect(result.current.writingStageKey).toBeNull();

    rerender({ turns: [buildTurn('t1', 'done', 'La zona es muy tranquila.')] });
    expect(result.current.writingStageKey).toBe('t1:done');

    act(() => result.current.finishWriting('t1:done'));
    expect(result.current.writingStageKey).toBeNull();

    rerender({ turns: [buildTurn('t1', 'done', 'La zona es muy tranquila.')] });
    expect(result.current.writingStageKey).toBeNull();
  });

  it('animates a new clarify turn that arrives later, until finished writing', () => {
    const { result, rerender } = renderHook(({ turns }) => useNewAskTurn(turns), {
      initialProps: { turns: [] as AskTurn[] },
    });

    rerender({
      turns: [
        buildTurn('t1', 'clarify', undefined, {
          question: '¿Qué tipo de vivienda busca?',
          options: ['Piso', 'Chalet'],
        }),
      ],
    });
    expect(result.current.writingStageKey).toBe('t1:clarify');

    act(() => result.current.finishWriting('t1:clarify'));
    expect(result.current.writingStageKey).toBeNull();
  });

  it('animates the final answer after a clarification round on the same turn', () => {
    const { result, rerender } = renderHook(({ turns }) => useNewAskTurn(turns), {
      initialProps: { turns: [] as AskTurn[] },
    });

    rerender({
      turns: [
        buildTurn('t1', 'clarify', undefined, {
          question: '¿Para vivir o invertir?',
          options: ['Vivir', 'Invertir'],
        }),
      ],
    });
    expect(result.current.writingStageKey).toBe('t1:clarify');

    act(() => result.current.finishWriting('t1:clarify'));
    expect(result.current.writingStageKey).toBeNull();

    rerender({ turns: [buildTurn('t1', 'pending')] });
    expect(result.current.writingStageKey).toBeNull();

    rerender({ turns: [buildTurn('t1', 'done', 'Para vivir es una excelente opción por sus parques.')] });
    expect(result.current.writingStageKey).toBe('t1:done');

    act(() => result.current.finishWriting('t1:done'));
    expect(result.current.writingStageKey).toBeNull();
  });

  it('does not animate error turns', () => {
    const { result, rerender } = renderHook(({ turns }) => useNewAskTurn(turns), {
      initialProps: { turns: [] as AskTurn[] },
    });

    rerender({ turns: [buildTurn('t1', 'error')] });
    expect(result.current.writingStageKey).toBeNull();
  });
});
