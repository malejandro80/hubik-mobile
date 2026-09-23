import { act, renderHook } from '@testing-library/react-native';
import { useTypewriter } from '../useTypewriter';
import { parseMessageParagraphs } from '../../lib/messageParser';
import { TYPEWRITER_WORD_INTERVAL_MS } from '../../constants/typewriter';

const paragraphs = parseMessageParagraphs('Hay nueve pisos');

const shown = (result: { current: ReturnType<typeof useTypewriter> }) =>
  result.current.visible.map((p) => p.segments.map((s) => s.text).join('')).join('\n\n');

describe('useTypewriter', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reveals one word per interval, reporting progress, then reports done once', () => {
    const onDone = jest.fn();
    const onProgress = jest.fn();
    const { result } = renderHook(() => useTypewriter(paragraphs, true, onDone, onProgress));

    expect(shown(result)).toBe('');
    expect(result.current.done).toBe(false);

    act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS));
    expect(shown(result)).toBe('Hay');

    act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS));
    expect(shown(result)).toBe('Hay nueve');
    expect(onProgress).toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS * 5));
    expect(shown(result)).toBe('Hay nueve pisos');
    expect(result.current.done).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows everything at once when not animating', () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useTypewriter(paragraphs, false, onDone));

    expect(shown(result)).toBe('Hay nueve pisos');
    expect(result.current.done).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('completes at once when animation is switched off midway', () => {
    const { result, rerender } = renderHook(({ animate }) => useTypewriter(paragraphs, animate), {
      initialProps: { animate: true },
    });
    act(() => jest.advanceTimersByTime(TYPEWRITER_WORD_INTERVAL_MS));

    rerender({ animate: false });

    expect(shown(result)).toBe('Hay nueve pisos');
    expect(result.current.done).toBe(true);
  });

  it('is done immediately for an empty message', () => {
    const onDone = jest.fn();
    const { result } = renderHook(() => useTypewriter([], true, onDone));

    expect(result.current.done).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stops its timer on unmount', () => {
    const { unmount } = renderHook(() => useTypewriter(paragraphs, true));

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
