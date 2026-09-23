import { act, renderHook } from '@testing-library/react-native';
import { useNewReply } from '../useNewReply';
import { ChatMessage } from '../../types/property';

const msg = (id: string, sender: ChatMessage['sender']): ChatMessage => ({ id, sender, text: id, timestamp: 'Ahora' });

describe('useNewReply', () => {
  it('never animates messages that were already there when the screen opened', () => {
    const { result } = renderHook(() => useNewReply([msg('u1', 'user'), msg('a1', 'assistant')]));

    expect(result.current.writingId).toBeNull();
  });

  it('animates an assistant reply that arrives later, until it finished writing', () => {
    const { result, rerender } = renderHook(({ messages }) => useNewReply(messages), {
      initialProps: { messages: [msg('a0', 'assistant')] },
    });

    rerender({ messages: [msg('a0', 'assistant'), msg('u1', 'user'), msg('a1', 'assistant')] });
    expect(result.current.writingId).toBe('a1');

    act(() => result.current.finishWriting('a1'));
    expect(result.current.writingId).toBeNull();
  });

  it('does not animate a new user message', () => {
    const { result, rerender } = renderHook(({ messages }) => useNewReply(messages), {
      initialProps: { messages: [] as ChatMessage[] },
    });

    rerender({ messages: [msg('u1', 'user')] });

    expect(result.current.writingId).toBeNull();
  });

  it('moves on to the newest reply when another one arrives', () => {
    const { result, rerender } = renderHook(({ messages }) => useNewReply(messages), {
      initialProps: { messages: [] as ChatMessage[] },
    });

    rerender({ messages: [msg('a1', 'assistant')] });
    rerender({ messages: [msg('a1', 'assistant'), msg('u2', 'user'), msg('a2', 'assistant')] });

    expect(result.current.writingId).toBe('a2');
  });

  it('animates again after the conversation is cleared', () => {
    const { result, rerender } = renderHook(({ messages }) => useNewReply(messages), {
      initialProps: { messages: [msg('a0', 'assistant')] },
    });

    rerender({ messages: [] });
    rerender({ messages: [msg('a1', 'assistant')] });

    expect(result.current.writingId).toBe('a1');
  });
});
