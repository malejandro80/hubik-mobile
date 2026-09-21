import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useAppMenu } from '../useAppMenu';

const mockPush = jest.fn();
const mockSignOut = jest.fn();
let mockAuth: Record<string, unknown>;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../useAuth', () => ({
  useAuth: () => mockAuth,
}));

const signedOut = {
  status: 'signedOut',
  capabilities: { canRegisterProperty: false, canCreateAgency: false, canViewAgencyListings: false },
  signOut: mockSignOut,
};

const owner = {
  status: 'signedIn',
  capabilities: { canRegisterProperty: false, canCreateAgency: false, canViewAgencyListings: true },
  signOut: mockSignOut,
};

const agent = {
  status: 'signedIn',
  capabilities: { canRegisterProperty: true, canCreateAgency: false, canViewAgencyListings: false },
  signOut: mockSignOut,
};

const titles = (items: { title: string }[]) => items.map((item) => item.title);

describe('useAppMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockAuth = signedOut;
  });

  it('starts closed and opens and closes on request', () => {
    const { result } = renderHook(() => useAppMenu());
    expect(result.current.menuProps.visible).toBe(false);

    act(() => result.current.open());
    expect(result.current.menuProps.visible).toBe(true);

    act(() => result.current.menuProps.onClose());
    expect(result.current.menuProps.visible).toBe(false);
  });

  it('offers sign in and hides the agent and owner options when signed out', () => {
    const { result } = renderHook(() => useAppMenu());

    expect(titles(result.current.menuProps.items)).toEqual(
      expect.arrayContaining(['Buscar Propiedades', 'Iniciar sesión'])
    );
    expect(titles(result.current.menuProps.items)).not.toContain('Registrar Vivienda');
    expect(titles(result.current.menuProps.items)).not.toContain('Mi inmobiliaria');
  });

  it('offers the agency and sign out to an owner', () => {
    mockAuth = owner;
    const { result } = renderHook(() => useAppMenu());

    expect(titles(result.current.menuProps.items)).toEqual(expect.arrayContaining(['Mi inmobiliaria', 'Cerrar sesión']));
    expect(titles(result.current.menuProps.items)).not.toContain('Registrar Vivienda');
  });

  it('offers listing registration to an agent', () => {
    mockAuth = agent;
    const { result } = renderHook(() => useAppMenu());

    expect(titles(result.current.menuProps.items)).toContain('Registrar Vivienda');
  });

  it.each([
    ['search', '/'],
    ['new_chat', '/'],
    ['sign_in', '/sign-in'],
    ['create_agency', '/create-agency'],
    ['my_agency', '/agency'],
  ])('sends "%s" to %s by default', (key, path) => {
    const { result } = renderHook(() => useAppMenu());

    act(() => result.current.menuProps.onSelectMenuItem(key));

    expect(mockPush).toHaveBeenCalledWith(path);
  });

  it('starts the listing composer on the chat screen from another screen', () => {
    const { result } = renderHook(() => useAppMenu());

    act(() => result.current.menuProps.onSelectMenuItem('register'));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/', params: { startRegistration: '1' } });
  });

  it('signs out, and warns when signing out fails', async () => {
    mockAuth = owner;
    mockSignOut.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useAppMenu());

    await act(async () => result.current.menuProps.onSelectMenuItem('sign_out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(Alert.alert).not.toHaveBeenCalled();

    await act(async () => result.current.menuProps.onSelectMenuItem('sign_out'));
    expect(Alert.alert).toHaveBeenCalledWith('No se pudo cerrar la sesión', 'Compruebe su conexión e inténtelo de nuevo.');
  });

  it.each(['saved', 'settings', 'help'])('does nothing for the removed placeholder item "%s"', (key) => {
    const { result } = renderHook(() => useAppMenu());

    act(() => result.current.menuProps.onSelectMenuItem(key));

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('lets a screen replace the default action for an item', () => {
    const onRegister = jest.fn();
    const { result } = renderHook(() => useAppMenu({ register: onRegister, search: () => undefined }));

    act(() => result.current.menuProps.onSelectMenuItem('register'));
    act(() => result.current.menuProps.onSelectMenuItem('search'));

    expect(onRegister).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
