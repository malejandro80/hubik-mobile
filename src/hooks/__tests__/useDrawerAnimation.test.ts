import { renderHook, act } from '@testing-library/react-native';
import { useDrawerAnimation } from '../useDrawerAnimation';

describe('useDrawerAnimation hook', () => {
  it('initializes with modalVisible matching visible prop', () => {
    const { result } = renderHook(() =>
      useDrawerAnimation({
        visible: false,
        drawerWidth: 340,
        isTest: true,
      })
    );

    expect(result.current.modalVisible).toBe(false);
    expect(result.current.slideAnim).toBeDefined();
    expect(result.current.fadeAnim).toBeDefined();
  });

  it('sets modalVisible to true when visible is true and runs open animation', () => {
    const { result } = renderHook(() =>
      useDrawerAnimation({
        visible: true,
        drawerWidth: 340,
        isTest: true,
      })
    );

    expect(result.current.modalVisible).toBe(true);
  });

  it('runs animateClose and triggers onComplete cleanup and callback', () => {
    const onClose = jest.fn();
    const callback = jest.fn();

    const { result } = renderHook(() =>
      useDrawerAnimation({
        visible: true,
        onClose,
        drawerWidth: 340,
        isTest: true,
      })
    );

    act(() => {
      result.current.animateClose(callback);
    });

    expect(result.current.modalVisible).toBe(false);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('handleClose invokes animateClose with onClose callback', () => {
    const onClose = jest.fn();

    const { result } = renderHook(() =>
      useDrawerAnimation({
        visible: true,
        onClose,
        drawerWidth: 340,
        isTest: true,
      })
    );

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.modalVisible).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('triggers handleClose when visible prop transitions from true to false', () => {
    const onClose = jest.fn();

    const { result, rerender } = renderHook(
      ({ visible }) =>
        useDrawerAnimation({
          visible,
          onClose,
          drawerWidth: 340,
          isTest: true,
        }),
      { initialProps: { visible: true } }
    );

    expect(result.current.modalVisible).toBe(true);

    rerender({ visible: false });

    expect(result.current.modalVisible).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

