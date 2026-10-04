import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PropertyAskThread } from '../PropertyAskThread';
import { AskTurn } from '../../types/propertyAsk';
import { TYPEWRITER_WORD_INTERVAL_MS } from '../../constants/typewriter';
import { useReduceMotion } from '../../hooks/useReduceMotion';

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockReduceMotion = useReduceMotion as jest.Mock;

const buildAnswerTurn = (id: string, answer: string): AskTurn => ({
  id,
  question: '¿Qué tal la zona?',
  status: 'done',
  answer,
  clarifications: [],
});

const buildClarifyTurn = (id: string, question: string, options: string[]): AskTurn => ({
  id,
  question: '¿Me conviene?',
  status: 'clarify',
  clarify: {
    question,
    options,
  },
  clarifications: [],
});

describe('PropertyAskThread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReduceMotion.mockReturnValue(false);
  });

  it('renders nothing when turns is empty', () => {
    const { toJSON } = render(<PropertyAskThread turns={[]} pending={false} onChoose={jest.fn()} />);
    expect(toJSON()).toBeNull();
  });

  it('renders immediately without typewriter animation when animate is false', () => {
    const turn = buildAnswerTurn('t1', 'La zona es muy tranquila y segura.');
    const { getByText } = render(
      <PropertyAskThread turns={[turn]} pending={false} onChoose={jest.fn()} animate={false} />
    );

    expect(getByText('¿Qué tal la zona?')).toBeTruthy();
    expect(getByText('La zona es muy tranquila y segura.')).toBeTruthy();
  });

  describe('typewriter reveal', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('progressively writes the answer word by word', () => {
      const turn = buildAnswerTurn('t1', 'La zona es muy tranquila y segura.');
      const { getByText, queryByText } = render(
        <PropertyAskThread
          turns={[turn]}
          pending={false}
          onChoose={jest.fn()}
          animate
          writingStageKey="t1:done"
        />
      );

      act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 2));
      expect(getByText('La zona')).toBeTruthy();
      expect(queryByText('La zona es muy tranquila y segura.')).toBeNull();

      act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 10));
      expect(getByText('La zona es muy tranquila y segura.')).toBeTruthy();
    });

    it('progressively writes the clarify question and reveals options only after done', () => {
      const turn = buildClarifyTurn('t2', '¿Buscas para vivir o para invertir?', ['Vivir', 'Invertir']);
      const onChoose = jest.fn();
      const { getByText, queryByText, queryByLabelText } = render(
        <PropertyAskThread
          turns={[turn]}
          pending={false}
          onChoose={onChoose}
          animate
          writingStageKey="t2:clarify"
        />
      );

      act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 2));
      expect(getByText('¿Buscas para')).toBeTruthy();
      expect(queryByText('Vivir')).toBeNull();
      expect(queryByLabelText('Responder: Vivir')).toBeNull();

      act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 10));
      expect(getByText('¿Buscas para vivir o para invertir?')).toBeTruthy();
      expect(getByText('Vivir')).toBeTruthy();
      expect(getByText('Invertir')).toBeTruthy();

      fireEvent.press(getByText('Vivir'));
      expect(onChoose).toHaveBeenCalledWith('Vivir');
    });

    it('gives screen readers the full text immediately while typing', () => {
      const turn = buildAnswerTurn('t1', 'La zona es muy tranquila y segura.');
      const { getByLabelText } = render(
        <PropertyAskThread
          turns={[turn]}
          pending={false}
          onChoose={jest.fn()}
          animate
          writingStageKey="t1:done"
        />
      );

      expect(getByLabelText('La zona es muy tranquila y segura.')).toBeTruthy();
    });

    it('animates automatically when a new done turn arrives after mount', () => {
      const { getByText, queryByText, rerender } = render(
        <PropertyAskThread turns={[]} pending={false} onChoose={jest.fn()} animate />
      );

      const turn = buildAnswerTurn('t1', 'La zona es muy tranquila y segura.');
      rerender(<PropertyAskThread turns={[turn]} pending={false} onChoose={jest.fn()} animate />);

      act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 2));
      expect(getByText('La zona')).toBeTruthy();
      expect(queryByText('La zona es muy tranquila y segura.')).toBeNull();

      act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 10));
      expect(getByText('La zona es muy tranquila y segura.')).toBeTruthy();
    });

    it('does not re-animate turns that finished writing on rerender', () => {
      const turn = buildAnswerTurn('t1', 'La zona es muy tranquila y segura.');
      const onFinishWriting = jest.fn();
      const { getByText, rerender } = render(
        <PropertyAskThread
          turns={[turn]}
          pending={false}
          onChoose={jest.fn()}
          animate
          writingStageKey="t1:done"
          onFinishWriting={onFinishWriting}
        />
      );

      act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 12));
      expect(getByText('La zona es muy tranquila y segura.')).toBeTruthy();
      expect(onFinishWriting).toHaveBeenCalledWith('t1:done');

      rerender(
        <PropertyAskThread
          turns={[turn]}
          pending={false}
          onChoose={jest.fn()}
          animate
          writingStageKey={null}
        />
      );
      expect(getByText('La zona es muy tranquila y segura.')).toBeTruthy();
    });

    it('renders immediately when reduce motion is enabled', () => {
      mockReduceMotion.mockReturnValue(true);
      const turn = buildClarifyTurn('t2', '¿Buscas para vivir o para invertir?', ['Vivir', 'Invertir']);
      const { getByText } = render(
        <PropertyAskThread
          turns={[turn]}
          pending={false}
          onChoose={jest.fn()}
          animate
          writingStageKey="t2:clarify"
        />
      );

      expect(getByText('¿Buscas para vivir o para invertir?')).toBeTruthy();
      expect(getByText('Vivir')).toBeTruthy();
    });
  });

  it('renders thinking state when turn is pending', () => {
    const turn: AskTurn = {
      id: 't1',
      question: '¿Hay colegios cerca?',
      status: 'pending',
      clarifications: [],
    };
    const { getByText } = render(
      <PropertyAskThread turns={[turn]} pending onChoose={jest.fn()} />
    );

    expect(getByText('Pensando…')).toBeTruthy();
  });

  it('renders error state when turn has error', () => {
    const turn: AskTurn = {
      id: 't1',
      question: '¿Hay colegios cerca?',
      status: 'error',
      clarifications: [],
    };
    const { getByText } = render(
      <PropertyAskThread turns={[turn]} pending={false} onChoose={jest.fn()} />
    );

    expect(getByText('No pude responder ahora. Inténtalo de nuevo en unos segundos.')).toBeTruthy();
  });
});
