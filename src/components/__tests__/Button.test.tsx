import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders title correctly', () => {
    const { getByText } = render(
      <Button title="Click Me" onPress={() => {}} />
    );
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('triggers onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Submit" onPress={onPressMock} />
    );

    fireEvent.press(getByText('Submit'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <Button title="Disabled" onPress={onPressMock} disabled />
    );

    fireEvent.press(getByText('Disabled'));
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('shows activity indicator when loading', () => {
    const { getByTestId, queryByText } = render(
      <Button title="Loading" onPress={() => {}} loading />
    );

    expect(getByTestId('button-loading-indicator')).toBeTruthy();
    expect(queryByText('Loading')).toBeNull();
  });
});
