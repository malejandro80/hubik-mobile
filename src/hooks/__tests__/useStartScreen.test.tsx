import { renderHook } from '@testing-library/react-native';
import { useStartScreen } from '../useStartScreen';
import { INVENTORY_EXAMPLES, SEARCH_EXAMPLES, START_SEARCH_QUERY } from '../../constants/startScreen';
import { REGISTER_COMMAND } from '../../lib/chatRegistration';

const mockPush = jest.fn();
let mockAuth: Record<string, unknown>;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../useAuth', () => ({
  useAuth: () => mockAuth,
}));

const capabilities = (overrides: Record<string, boolean> = {}) => ({
  canRegisterProperty: false,
  canCreateAgency: false,
  canViewAgencyListings: false,
  ...overrides,
});

const signedOut = { status: 'signedOut', profile: null, capabilities: capabilities() };

const owner = {
  status: 'signedIn',
  profile: { userId: 'u1', role: 'owner', agencyId: 'a1', displayName: '  Carlos Ruiz  ' },
  capabilities: capabilities({ canRegisterProperty: true, canViewAgencyListings: true }),
};

describe('useStartScreen', () => {
  const handleSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = signedOut;
  });

  it('gives an owner inventory examples, the owner audience and the agency first', () => {
    mockAuth = owner;
    const { result } = renderHook(() => useStartScreen(handleSend));

    expect(result.current.audience).toBe('owner');
    expect(result.current.examples).toEqual(INVENTORY_EXAMPLES);
    expect(result.current.actions).toEqual(['my_agency', 'register', 'search']);
  });

  it('gives a visitor search examples', () => {
    const { result } = renderHook(() => useStartScreen(handleSend));

    expect(result.current.audience).toBe('visitor');
    expect(result.current.examples).toEqual(SEARCH_EXAMPLES);
  });

  it('gives a client search examples and the way to create an agency', () => {
    mockAuth = {
      status: 'signedIn',
      profile: { userId: 'u2', role: 'client', agencyId: null, displayName: 'Ana' },
      capabilities: capabilities({ canCreateAgency: true }),
    };
    const { result } = renderHook(() => useStartScreen(handleSend));

    expect(result.current.audience).toBe('client');
    expect(result.current.examples).toEqual(SEARCH_EXAMPLES);
    expect(result.current.actions).toEqual(['search', 'create_agency']);
  });

  it('passes the trimmed display name, or null when there is none', () => {
    mockAuth = owner;
    const { result, rerender } = renderHook(() => useStartScreen(handleSend));
    expect(result.current.name).toBe('Carlos Ruiz');

    mockAuth = signedOut;
    rerender({});
    expect(result.current.name).toBeNull();

    mockAuth = { ...owner, profile: { ...owner.profile, displayName: '   ' } };
    rerender({});
    expect(result.current.name).toBeNull();
  });

  it('sends the friendly search query for the search card', () => {
    const { result } = renderHook(() => useStartScreen(handleSend));

    result.current.onAction('search');

    expect(handleSend).toHaveBeenCalledWith(START_SEARCH_QUERY);
  });

  it('starts the composer through the same command as the menu', () => {
    mockAuth = owner;
    const { result } = renderHook(() => useStartScreen(handleSend));

    result.current.onAction('register');

    expect(handleSend).toHaveBeenCalledWith(REGISTER_COMMAND);
  });

  it('opens the sign-in and agency screens by route, without sending a message', () => {
    const { result } = renderHook(() => useStartScreen(handleSend));

    result.current.onAction('sign_in');
    result.current.onAction('my_agency');
    result.current.onAction('create_agency');

    expect(mockPush).toHaveBeenNthCalledWith(1, '/sign-in');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/agency');
    expect(mockPush).toHaveBeenNthCalledWith(3, '/create-agency');
    expect(handleSend).not.toHaveBeenCalled();
  });

  it('sends an example exactly as written', () => {
    const { result } = renderHook(() => useStartScreen(handleSend));

    result.current.onExample('Pisos en venta en Valencia');

    expect(handleSend).toHaveBeenCalledWith('Pisos en venta en Valencia');
  });
});
