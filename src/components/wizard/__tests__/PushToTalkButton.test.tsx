import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PushToTalkButton } from '../PushToTalkButton';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

describe('PushToTalkButton', () => {
  it('renders idle state with caption', () => {
    const { getByLabelText, getByText } = render(
      <PushToTalkButton
        isRecording={false}
        onPressIn={jest.fn()}
        onPressOut={jest.fn()}
      />
    );

    expect(getByLabelText('Dictar detalles por voz')).toBeTruthy();
    expect(getByText('Mantenga presionado para dictar')).toBeTruthy();
  });

  it('triggers onPressIn and onPressOut with recording state', () => {
    const handleIn = jest.fn();
    const handleOut = jest.fn();

    const { getByLabelText, rerender, getByText } = render(
      <PushToTalkButton
        isRecording={false}
        onPressIn={handleIn}
        onPressOut={handleOut}
      />
    );

    const button = getByLabelText('Dictar detalles por voz');
    fireEvent(button, 'pressIn');
    expect(handleIn).toHaveBeenCalledTimes(1);

    fireEvent(button, 'pressOut');
    expect(handleOut).toHaveBeenCalledTimes(1);

    rerender(
      <PushToTalkButton
        isRecording={true}
        onPressIn={handleIn}
        onPressOut={handleOut}
      />
    );

    expect(getByLabelText('Grabando audio de la vivienda')).toBeTruthy();
    expect(getByText('Soltar al terminar de hablar')).toBeTruthy();
  });
});
