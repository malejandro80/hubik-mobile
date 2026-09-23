import { renderHook } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SPLASH_MAX_WAIT_MS } from '../../constants/splash';
import { useSplashHandoff } from '../useSplashHandoff';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

const hideAsync = SplashScreen.hideAsync as jest.Mock;

describe('useSplashHandoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    hideAsync.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the splash while the app is not ready', () => {
    renderHook(() => useSplashHandoff(false));
    jest.advanceTimersByTime(SPLASH_MAX_WAIT_MS - 1);
    expect(hideAsync).not.toHaveBeenCalled();
  });

  it('hides the splash as soon as the app is ready', () => {
    const { rerender } = renderHook(({ ready }) => useSplashHandoff(ready), {
      initialProps: { ready: false },
    });
    rerender({ ready: true });
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('hides the splash after the safety timeout when readiness never arrives', () => {
    renderHook(() => useSplashHandoff(false));
    jest.advanceTimersByTime(SPLASH_MAX_WAIT_MS);
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('hides only once when ready arrives after the timeout', () => {
    const { rerender } = renderHook(({ ready }) => useSplashHandoff(ready), {
      initialProps: { ready: false },
    });
    jest.advanceTimersByTime(SPLASH_MAX_WAIT_MS);
    rerender({ ready: true });
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });

  it('ignores a rejected hide (splash already gone)', async () => {
    hideAsync.mockRejectedValueOnce(new Error('No native splash screen registered'));
    renderHook(() => useSplashHandoff(true));
    await Promise.resolve();
    expect(hideAsync).toHaveBeenCalledTimes(1);
  });
});
