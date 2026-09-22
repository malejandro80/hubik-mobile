import { act, renderHook } from '@testing-library/react-native';
import { useInstallPrompt } from '../useInstallPrompt';

describe('useInstallPrompt', () => {
  it('shows the sheet from the start', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.sheetVisible).toBe(true);
  });

  it('hides it on dismiss and brings it back on reopen', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => result.current.dismiss());
    expect(result.current.sheetVisible).toBe(false);

    act(() => result.current.reopen());
    expect(result.current.sheetVisible).toBe(true);
  });
});
