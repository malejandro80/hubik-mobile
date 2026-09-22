import { act, renderHook } from '@testing-library/react-native';
import { OPEN_APP_CHECK_MS } from '../../constants/appLink';
import { useOpenApp } from '../useOpenApp';

const LINK = 'hubikmobile://p/piso-en-madrid-6ff52f65';

interface FakeDocument {
  location: { assign: jest.Mock };
  visibilityState: 'visible' | 'hidden';
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
}

describe('useOpenApp', () => {
  let fake: FakeDocument;
  let visibilityListeners: (() => void)[];
  const originalDocument = (global as { document?: unknown }).document;

  beforeEach(() => {
    jest.useFakeTimers();
    visibilityListeners = [];
    fake = {
      location: { assign: jest.fn() },
      visibilityState: 'visible',
      addEventListener: jest.fn((_type: string, listener: () => void) => visibilityListeners.push(listener)),
      removeEventListener: jest.fn((_type: string, listener: () => void) => {
        visibilityListeners = visibilityListeners.filter((existing) => existing !== listener);
      }),
    };
    (global as { document?: unknown }).document = fake;
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as { document?: unknown }).document = originalDocument;
  });

  const hidePage = () => {
    fake.visibilityState = 'hidden';
    visibilityListeners.forEach((listener) => listener());
  };

  it('starts idle', () => {
    const { result } = renderHook(() => useOpenApp(LINK));

    expect(result.current.status).toBe('idle');
    expect(fake.location.assign).not.toHaveBeenCalled();
  });

  it('navigates to the app link and waits to see whether the app took over', () => {
    const { result } = renderHook(() => useOpenApp(LINK));

    act(() => result.current.open());

    expect(fake.location.assign).toHaveBeenCalledWith(LINK);
    expect(result.current.status).toBe('trying');
  });

  it('says the app did not open when the page is still visible after the delay', () => {
    const { result } = renderHook(() => useOpenApp(LINK));
    act(() => result.current.open());

    act(() => {
      jest.advanceTimersByTime(OPEN_APP_CHECK_MS);
    });

    expect(result.current.status).toBe('not_opened');
  });

  it('shows nothing more when the page is hidden because the app opened', () => {
    const { result } = renderHook(() => useOpenApp(LINK));
    act(() => result.current.open());

    act(() => hidePage());
    act(() => {
      jest.advanceTimersByTime(OPEN_APP_CHECK_MS * 2);
    });

    expect(result.current.status).toBe('idle');
  });

  it('tries again from the start when opened a second time', () => {
    const { result } = renderHook(() => useOpenApp(LINK));
    act(() => result.current.open());
    act(() => {
      jest.advanceTimersByTime(OPEN_APP_CHECK_MS);
    });
    expect(result.current.status).toBe('not_opened');

    act(() => result.current.open());

    expect(result.current.status).toBe('trying');
    expect(fake.location.assign).toHaveBeenCalledTimes(2);
  });

  it('does nothing without a link', () => {
    const { result } = renderHook(() => useOpenApp(null));

    act(() => result.current.open());

    expect(fake.location.assign).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('stops listening and never updates after it unmounts', () => {
    const { result, unmount } = renderHook(() => useOpenApp(LINK));
    act(() => result.current.open());
    expect(visibilityListeners).toHaveLength(1);

    unmount();

    expect(visibilityListeners).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });
});
