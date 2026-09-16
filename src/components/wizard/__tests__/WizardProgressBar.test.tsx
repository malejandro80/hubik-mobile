import React from 'react';
import { render } from '@testing-library/react-native';
import { WizardProgressBar } from '../WizardProgressBar';

describe('WizardProgressBar', () => {
  it('renders all 3 steps and highlights current step', () => {
    const { getByText, getByLabelText } = render(<WizardProgressBar currentStep={1} />);

    expect(getByLabelText('Paso 1 de 3')).toBeTruthy();
    expect(getByText('1. Dictado')).toBeTruthy();
    expect(getByText('2. Ubicación y Fotos')).toBeTruthy();
    expect(getByText('3. Validación')).toBeTruthy();
  });

  it('updates accessibility label when step changes', () => {
    const { getByLabelText } = render(<WizardProgressBar currentStep={2} />);
    expect(getByLabelText('Paso 2 de 3')).toBeTruthy();
  });
});
