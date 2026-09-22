import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { InstallSheet } from '../InstallSheet';

const STORE = 'https://apps.apple.com/app/hubik/id1';

const renderSheet = (overrides: Partial<React.ComponentProps<typeof InstallSheet>> = {}) => {
  const onDismiss = jest.fn();
  const utils = render(<InstallSheet visible storeUrl={STORE} onDismiss={onDismiss} {...overrides} />);
  return { onDismiss, ...utils };
};

describe('InstallSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing while hidden', () => {
    const { toJSON } = renderSheet({ visible: false });

    expect(toJSON()).toBeNull();
  });

  it('invites the visitor to get the app', () => {
    const { getByText } = renderSheet();

    expect(getByText('Vea más propiedades en la app de Hubik')).toBeTruthy();
    expect(getByText('Busque propiedades hablando o escribiendo, desde su móvil.')).toBeTruthy();
    expect(getByText('Descargar la app')).toBeTruthy();
    expect(getByText('Seguir en el navegador')).toBeTruthy();
  });

  it('opens the store link from the download button', () => {
    const { getByLabelText } = renderSheet();

    const button = getByLabelText('Descargar la app de Hubik');
    expect(button.props.accessibilityRole).toBe('button');
    fireEvent.press(button);

    expect(Linking.openURL).toHaveBeenCalledWith(STORE);
  });

  it('says "Próximamente" and does nothing while there is no store link', () => {
    const { getByText, getByLabelText, queryByText } = renderSheet({ storeUrl: null });

    expect(getByText('Próximamente')).toBeTruthy();
    expect(queryByText('Descargar la app')).toBeNull();
    const button = getByLabelText('La app de Hubik estará disponible próximamente');
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);

    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('dismisses from "Seguir en el navegador" and from the dimmed area', () => {
    const { onDismiss, getByText, getByLabelText } = renderSheet();

    fireEvent.press(getByText('Seguir en el navegador'));
    fireEvent.press(getByLabelText('Cerrar la invitación a la app', { includeHiddenElements: true }));

    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('is announced as a modal dialog', () => {
    const { getByTestId } = renderSheet();

    expect(getByTestId('install-sheet').props.accessibilityViewIsModal).toBe(true);
  });

  describe('open in the app', () => {
    const APP_LINK = 'hubikmobile://p/piso-en-madrid-6ff52f65';

    it('offers to open the listing in the app, first, when a listing is loaded', () => {
      const onOpenApp = jest.fn();
      const { getByText, getByLabelText } = renderSheet({ appLink: APP_LINK, onOpenApp });

      expect(getByText('Abrir en la app')).toBeTruthy();
      const button = getByLabelText('Abrir este anuncio en la app de Hubik');
      expect(button.props.accessibilityRole).toBe('button');
      fireEvent.press(button);

      expect(onOpenApp).toHaveBeenCalledTimes(1);
      expect(getByText('Descargar la app')).toBeTruthy();
      expect(getByText('Seguir en el navegador')).toBeTruthy();
    });

    it('has no open button when there is nothing to open', () => {
      const { queryByText } = renderSheet({ appLink: null });

      expect(queryByText('Abrir en la app')).toBeNull();
    });

    it('says the app may not be installed when it did not open, and keeps the other options', () => {
      const { getByText, queryByText } = renderSheet({ appLink: APP_LINK, onOpenApp: jest.fn(), openStatus: 'not_opened' });

      expect(getByText('¿No se abrió? Puede que todavía no tenga la app instalada.')).toBeTruthy();
      expect(getByText('Descargar la app')).toBeTruthy();

      expect(queryByText('Abrir en la app')).toBeTruthy();
    });

    it('shows no hint while idle or while still trying', () => {
      const idle = renderSheet({ appLink: APP_LINK, onOpenApp: jest.fn(), openStatus: 'idle' });
      expect(idle.queryByText(/No se abrió/)).toBeNull();
      idle.unmount();

      const trying = renderSheet({ appLink: APP_LINK, onOpenApp: jest.fn(), openStatus: 'trying' });
      expect(trying.queryByText(/No se abrió/)).toBeNull();
    });

    it('still says "Próximamente" for the download while the open button is offered', () => {
      const { getByText } = renderSheet({ appLink: APP_LINK, onOpenApp: jest.fn(), storeUrl: null });

      expect(getByText('Abrir en la app')).toBeTruthy();
      expect(getByText('Próximamente')).toBeTruthy();
    });
  });
});

