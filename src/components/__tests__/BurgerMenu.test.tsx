import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BurgerMenu } from '../BurgerMenu';
import { MENU_ITEMS } from '../BurgerMenu.items';

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

    expect(getByText('Don Carlos')).toBeTruthy();
    expect(getByText('Buscar Propiedades')).toBeTruthy();
    expect(getByText('Registrar Vivienda')).toBeTruthy();
    expect(getByText('Reiniciar Chat')).toBeTruthy();
    expect(getByText('Propiedades Guardadas')).toBeTruthy();
    expect(getByText('Ajustes y Accesibilidad')).toBeTruthy();
    expect(getByText('Ayuda y Soporte')).toBeTruthy();

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

  it('exports MENU_ITEMS with unique keys, valid titles, and icons', () => {
    expect(MENU_ITEMS.length).toBeGreaterThan(0);
    const keys = MENU_ITEMS.map((item) => item.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);

    for (const item of MENU_ITEMS) {
      expect(item.key).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });
});

