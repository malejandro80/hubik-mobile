import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BurgerMenu } from '../BurgerMenu';

describe('BurgerMenu Component', () => {
  it('renders correctly when visible and allows closing', () => {
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    const { getByText, getByLabelText } = render(
      <BurgerMenu
        visible={true}
        onClose={handleClose}
        onSelectMenuItem={handleSelect}
      />
    );

    // Profile & Header
    expect(getByText('Don Carlos')).toBeTruthy();
    expect(getByText('Buscar Propiedades')).toBeTruthy();
    expect(getByText('Reiniciar Chat')).toBeTruthy();
    expect(getByText('Propiedades Guardadas')).toBeTruthy();
    expect(getByText('Ajustes y Accesibilidad')).toBeTruthy();
    expect(getByText('Ayuda y Soporte')).toBeTruthy();

    // Close button
    const closeBtn = getByLabelText('Cerrar menú lateral');
    expect(closeBtn).toBeTruthy();
    fireEvent.press(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onSelectMenuItem when item is clicked', () => {
    const handleClose = jest.fn();
    const handleSelect = jest.fn();

    const { getByText } = render(
      <BurgerMenu
        visible={true}
        onClose={handleClose}
        onSelectMenuItem={handleSelect}
      />
    );

    const restartItem = getByText('Reiniciar Chat');
    fireEvent.press(restartItem);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith('new_chat');
  });
});
