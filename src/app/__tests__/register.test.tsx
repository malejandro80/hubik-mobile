import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import RegisterPropertyScreen from '../register';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

describe('RegisterPropertyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders header, title, subtitle, and guide card with example quote', () => {
    const { getByText, getByPlaceholderText } = render(<RegisterPropertyScreen />);

    expect(getByText('Hubik')).toBeTruthy();
    expect(getByText('Vamos a registrar su vivienda, Don Carlos.')).toBeTruthy();
    expect(
      getByText('Es tan fácil como contármelo con sus propias palabras, sin tecnicismos ni prisas.')
    ).toBeTruthy();
    expect(getByText('Puede decir algo como:')).toBeTruthy();
    expect(getByText('Un ejemplo sencillo y natural')).toBeTruthy();
    expect(
      getByText('“Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.”')
    ).toBeTruthy();
    expect(getByPlaceholderText('Escriba su consulta aquí...')).toBeTruthy();
  });

  it('populates input field when tapping the quote example box', () => {
    const { getByLabelText, getByDisplayValue } = render(<RegisterPropertyScreen />);

    const quoteBox = getByLabelText('Usar frase de ejemplo');
    fireEvent.press(quoteBox);

    expect(
      getByDisplayValue('Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.')
    ).toBeTruthy();
  });

  it('shows microphone modal on mic press and populates example', () => {
    const { getByLabelText } = render(<RegisterPropertyScreen />);

    const micBtn = getByLabelText('Hablar por micrófono');
    fireEvent.press(micBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Micrófono Hubik',
      'Escuchando... Cuéntenos los detalles de su vivienda con tranquilidad.',
      expect.any(Array)
    );
  });

  it('sends property description and displays confirmation alert', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterPropertyScreen />);

    const input = getByPlaceholderText('Escriba su consulta aquí...');
    const sendBtn = getByText('Enviar');

    fireEvent.changeText(input, 'Piso en Chamberí con terraza');
    fireEvent.press(sendBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Vivienda recibida',
      expect.stringContaining('Piso en Chamberí con terraza'),
      expect.any(Array)
    );
  });

  it('calls router.back when tapping header back button', () => {
    const { getByLabelText } = render(<RegisterPropertyScreen />);

    const backBtn = getByLabelText('Regresar');
    fireEvent.press(backBtn);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('opens burger menu and allows selecting menu items', () => {
    const { getByLabelText, getByText } = render(<RegisterPropertyScreen />);

    const menuBtn = getByLabelText('Menú de opciones');
    fireEvent.press(menuBtn);

    expect(getByText('Registrar Vivienda')).toBeTruthy();
    expect(getByText('Buscar Propiedades')).toBeTruthy();

    const searchItem = getByText('Buscar Propiedades');
    fireEvent.press(searchItem);

    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
