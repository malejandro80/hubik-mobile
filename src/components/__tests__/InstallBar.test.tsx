import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { InstallBar } from '../InstallBar';

describe('InstallBar', () => {
  it('keeps offering the app and reports when the button is pressed', () => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = render(<InstallBar onPress={onPress} />);

    expect(getByText('Hubik · Mejor en la app')).toBeTruthy();
    const button = getByLabelText('Ver cómo descargar la app de Hubik');
    expect(button.props.accessibilityRole).toBe('button');
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
