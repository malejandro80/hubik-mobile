import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignInScreen from '../sign-in';

const mockReplace = jest.fn();
const mockSignIn = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn(), push: jest.fn() }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ status: 'signedOut', signIn: mockSignIn }),
}));

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers Google, Apple and continuing without an account', () => {
    const { getByText, getByLabelText } = render(<SignInScreen />);

    expect(getByText('Bienvenido a Hubik')).toBeTruthy();
    expect(getByLabelText('Continuar con Google')).toBeTruthy();
    expect(getByLabelText('Continuar con Apple')).toBeTruthy();
    expect(getByLabelText('Seguir buscando sin cuenta')).toBeTruthy();
  });

  it('signs in with the chosen provider and returns to the home screen', async () => {
    mockSignIn.mockResolvedValue('signedIn');
    const { getByLabelText } = render(<SignInScreen />);

    fireEvent.press(getByLabelText('Continuar con Google'));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('google'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('uses Apple when that button is pressed', async () => {
    mockSignIn.mockResolvedValue('signedIn');
    const { getByLabelText } = render(<SignInScreen />);

    fireEvent.press(getByLabelText('Continuar con Apple'));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('apple'));
  });

  it('stays on the screen without an error when the user cancels', async () => {
    mockSignIn.mockResolvedValue('cancelled');
    const { getByLabelText, queryByText } = render(<SignInScreen />);

    fireEvent.press(getByLabelText('Continuar con Google'));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(queryByText(/No pudimos iniciar sesión/)).toBeNull();
  });

  it('shows a readable error when sign-in fails', async () => {
    mockSignIn.mockRejectedValue(new Error('provider disabled'));
    const { getByLabelText, findByText } = render(<SignInScreen />);

    fireEvent.press(getByLabelText('Continuar con Google'));

    expect(await findByText(/No pudimos iniciar sesión \(provider disabled\)/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('goes back to the home screen when continuing without an account', () => {
    const { getByLabelText } = render(<SignInScreen />);

    fireEvent.press(getByLabelText('Seguir buscando sin cuenta'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
