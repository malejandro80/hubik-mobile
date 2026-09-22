import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useGalleryKeys } from '../useGalleryKeys';

type Listener = (event: { key: string }) => void;

describe('useGalleryKeys', () => {
  let listeners: Listener[];
  const originalDocument = (global as { document?: unknown }).document;

  beforeEach(() => {
    listeners = [];
    (global as { document?: unknown }).document = {
      addEventListener: jest.fn((_type: string, listener: Listener) => listeners.push(listener)),
      removeEventListener: jest.fn((_type: string, listener: Listener) => {
        listeners = listeners.filter((existing) => existing !== listener);
      }),
    };
    jest.replaceProperty(Platform, 'OS', 'web');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (global as { document?: unknown }).document = originalDocument;
  });

  const press = (key: string) => listeners.forEach((listener) => listener({ key }));

  it('moves with the arrow keys on the web', () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    renderHook(() => useGalleryKeys({ enabled: true, onPrevious, onNext }));

    press('ArrowRight');
    press('ArrowLeft');
    press('ArrowRight');

    expect(onNext).toHaveBeenCalledTimes(2);
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it('ignores every other key', () => {
    const onPrevious = jest.fn();
    const onNext = jest.fn();
    renderHook(() => useGalleryKeys({ enabled: true, onPrevious, onNext }));

    press('Enter');
    press('a');

    expect(onPrevious).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('does nothing while disabled', () => {
    const onNext = jest.fn();
    renderHook(() => useGalleryKeys({ enabled: false, onPrevious: jest.fn(), onNext }));

    press('ArrowRight');

    expect(listeners).toHaveLength(0);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('does not listen on native', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    renderHook(() => useGalleryKeys({ enabled: true, onPrevious: jest.fn(), onNext: jest.fn() }));

    expect(listeners).toHaveLength(0);
  });

  it('stops listening when it unmounts', () => {
    const { unmount } = renderHook(() => useGalleryKeys({ enabled: true, onPrevious: jest.fn(), onNext: jest.fn() }));
    expect(listeners).toHaveLength(1);

    unmount();

    expect(listeners).toHaveLength(0);
  });
});
