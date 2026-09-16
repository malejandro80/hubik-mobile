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

describe('RegisterPropertyScreen (InmoVoz Stepped Wizard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders progress bar in Step 1, header, title, subtitle, and guide card', () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(<RegisterPropertyScreen />);

    expect(getByText('Hubik')).toBeTruthy();
    expect(getByLabelText('Paso 1 de 3')).toBeTruthy();
    expect(getByText('1. Dictado')).toBeTruthy();
    expect(getByText('Vamos a registrar su vivienda, Don Carlos.')).toBeTruthy();
    expect(
      getByText('Es tan fácil como contármelo con sus propias palabras, sin tecnicismos ni prisas.')
    ).toBeTruthy();
    expect(getByText('Puede decir algo como:')).toBeTruthy();
    expect(
      getByText('“Quiero poner a la venta mi piso en Chamberí de 3 habitaciones por 420.000 euros con ascensor.”')
    ).toBeTruthy();
    expect(getByLabelText('Dictar detalles por voz')).toBeTruthy();
    expect(getByPlaceholderText('Escriba su consulta aquí...')).toBeTruthy();
  });

  it('populates input and extracts data when tapping example quote', () => {
    const { getByLabelText, getByText } = render(<RegisterPropertyScreen />);

    const quoteBox = getByLabelText('Usar frase de ejemplo');
    fireEvent.press(quoteBox);

    // Reactive visual summary should render extracted chips
    expect(getByText('Datos Extraídos por Voz')).toBeTruthy();
    expect(getByText('Piso · Chamberí')).toBeTruthy();
    expect(getByText('420.000 €')).toBeTruthy();
    expect(getByText('3 hab.')).toBeTruthy();

    // Binary clarification question should be active
    expect(getByText(/Aclaración 1 de 2/)).toBeTruthy();
    expect(getByText('¿El ascensor cuenta con acceso a cota cero (sin escalón en el portal)?')).toBeTruthy();
  });

  it('progresses through binary questions to unlock Step 2', () => {
    const { getByLabelText, getByText } = render(<RegisterPropertyScreen />);

    // Ingest data via quote
    fireEvent.press(getByLabelText('Usar frase de ejemplo'));

    // Question 1: Cota cero -> Answer [SÍ]
    fireEvent.press(getByLabelText('Sí'));

    // Question 2: Parking -> Answer [NO]
    expect(getByText(/Aclaración 2 de 2/)).toBeTruthy();
    fireEvent.press(getByLabelText('No'));

    // Step 1 complete -> "Continuar a Ubicación y Fotos" button appears
    const continueBtn = getByLabelText('Continuar a Ubicación y Fotos');
    expect(continueBtn).toBeTruthy();

    // Advance to Step 2
    fireEvent.press(continueBtn);
    expect(getByLabelText('Paso 2 de 3')).toBeTruthy();
    expect(getByText('Ubicación y Fotografías')).toBeTruthy();
  });

  it('navigates through Step 2 (photos) and Step 3 (validation & publication)', () => {
    const { getByLabelText, getByText } = render(<RegisterPropertyScreen />);

    // Ingest and finish Step 1
    fireEvent.press(getByLabelText('Usar frase de ejemplo'));
    fireEvent.press(getByLabelText('Sí'));
    fireEvent.press(getByLabelText('No'));
    fireEvent.press(getByLabelText('Continuar a Ubicación y Fotos'));

    // Step 2: Add photos and continue
    expect(getByText('Ubicación y Fotografías')).toBeTruthy();
    fireEvent.press(getByLabelText('Añadir foto de salón'));
    fireEvent.press(getByLabelText('Continuar a Validación'));

    // Step 3: Verification & PII protection
    expect(getByLabelText('Paso 3 de 3')).toBeTruthy();
    expect(getByText('Validación y Publicación')).toBeTruthy();
    expect(getByText('9872023VH5797S0001WX')).toBeTruthy();
    expect(getByText('Aislamiento Estricto de PII')).toBeTruthy();

    // Publish
    const publishBtn = getByLabelText('Publicar Vivienda');
    fireEvent.press(publishBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      '¡Vivienda Publicada!',
      expect.stringContaining('Su piso en Chamberí ha sido registrado exitosamente en Hubik.'),
      expect.any(Array)
    );
  });

  it('calls router.back on Step 1, or steps backward on Step 2 & 3', () => {
    const { getByLabelText, getByText } = render(<RegisterPropertyScreen />);

    // On Step 1: back button calls router.back()
    const backBtn = getByLabelText('Regresar');
    fireEvent.press(backBtn);
    expect(mockBack).toHaveBeenCalledTimes(1);

    // Ingest and advance to Step 2
    fireEvent.press(getByLabelText('Usar frase de ejemplo'));
    fireEvent.press(getByLabelText('Sí'));
    fireEvent.press(getByLabelText('No'));
    fireEvent.press(getByLabelText('Continuar a Ubicación y Fotos'));
    expect(getByText('Ubicación y Fotografías')).toBeTruthy();

    // On Step 2: back button goes back to Step 1
    fireEvent.press(backBtn);
    expect(getByText('Vamos a registrar su vivienda, Don Carlos.')).toBeTruthy();
  });

  it('handles microphone modal and BurgerMenu navigation', () => {
    const { getByLabelText } = render(<RegisterPropertyScreen />);

    const micBtn = getByLabelText('Hablar por micrófono');
    fireEvent.press(micBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Micrófono Hubik',
      'Escuchando... Cuéntenos los detalles de su vivienda con tranquilidad.',
      expect.any(Array)
    );

    const menuBtn = getByLabelText('Menú de opciones');
    fireEvent.press(menuBtn);
    expect(getByLabelText('Cerrar menú lateral')).toBeTruthy();
  });
});
