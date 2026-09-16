import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BinaryClarificationCard } from '../BinaryClarificationCard';

describe('BinaryClarificationCard', () => {
  const mockQuestion = {
    id: 'q-1',
    field: 'elevator_cota_cero' as const,
    question: '¿El ascensor cuenta con acceso a cota cero?',
    explanation: 'Sin escalón en el portal.',
    answered: false,
  };

  it('renders question, explanation, and binary buttons', () => {
    const handleAnswer = jest.fn();
    const { getByText, getByLabelText } = render(
      <BinaryClarificationCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={2}
        onAnswer={handleAnswer}
      />
    );

    expect(getByText('Aclaración 1 de 2')).toBeTruthy();
    expect(getByText('¿El ascensor cuenta con acceso a cota cero?')).toBeTruthy();
    expect(getByText('Sin escalón en el portal.')).toBeTruthy();
    expect(getByLabelText('Sí')).toBeTruthy();
    expect(getByLabelText('No')).toBeTruthy();
  });

  it('triggers onAnswer with true when tapping SÍ and false when tapping NO', () => {
    const handleAnswer = jest.fn();
    const { getByLabelText } = render(
      <BinaryClarificationCard
        question={mockQuestion}
        currentIndex={0}
        totalQuestions={2}
        onAnswer={handleAnswer}
      />
    );

    fireEvent.press(getByLabelText('Sí'));
    expect(handleAnswer).toHaveBeenCalledWith('q-1', true);

    fireEvent.press(getByLabelText('No'));
    expect(handleAnswer).toHaveBeenCalledWith('q-1', false);
  });
});
