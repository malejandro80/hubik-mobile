import { AccessibilityInfo } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useReduceMotion } from '../useReduceMotion';

describe('useReduceMotion', () => {
  let listener: ((enabled: boolean) => void) | undefined;
  const remove = jest.fn();

  beforeEach(() => {
    listener = undefined;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, handler: (enabled: boolean) => void) => {
      listener = handler;
      return { remove };
    }) as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('reads the current setting', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { result } = renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('follows changes to the setting and unsubscribes on unmount', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result, unmount } = renderHook(() => useReduceMotion());
    await waitFor(() => expect(listener).toBeDefined());

    act(() => listener?.(true));
    expect(result.current).toBe(true);

    unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('treats an unavailable setting as off', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('unavailable'));
    const { result } = renderHook(() => useReduceMotion());

    await act(async () => undefined);
    expect(result.current).toBe(false);
  });
});
