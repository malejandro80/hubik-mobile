import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Header } from '../Header';

describe('Header Component', () => {
  it('renders brand title, home icon badge, back button, and menu button', () => {
    const handleBack = jest.fn();
    const handleMenu = jest.fn();

    const { getByText, getByLabelText } = render(
      <Header title="Hubik" onBackPress={handleBack} onMenuPress={handleMenu} />
    );

    expect(getByText('Hubik')).toBeTruthy();
    expect(getByText('Hubik Real Estate AI')).toBeTruthy();

    const backButton = getByLabelText('Regresar');
    expect(backButton).toBeTruthy();
    fireEvent.press(backButton);
    expect(handleBack).toHaveBeenCalledTimes(1);

    const menuButton = getByLabelText('Menú de opciones');
    expect(menuButton).toBeTruthy();
    fireEvent.press(menuButton);
    expect(handleMenu).toHaveBeenCalledTimes(1);
  });

  it('hides back button when showBack is explicitly false', () => {
    const handleMenu = jest.fn();

    const { queryByLabelText, getByText } = render(
      <Header title="Hubik" showBack={false} onMenuPress={handleMenu} />
    );

    expect(getByText('Hubik')).toBeTruthy();
    expect(queryByLabelText('Regresar')).toBeNull();
  });
});
