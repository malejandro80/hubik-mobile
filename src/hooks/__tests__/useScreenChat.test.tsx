import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { ConversationProvider } from '../ConversationProvider';
import { useConversation } from '../useConversation';
import { useScreenChat } from '../useScreenChat';

jest.mock('../useAuth', () => ({
  useAuth: () => ({ status: 'signedIn' }),
}));

type Command = { type: 'ping'; word: string };

const parse = jest.fn((text: string): Command | null => (text.startsWith('ping ') ? { type: 'ping', word: text.slice(5) } : null));
const execute = jest.fn(async (command: Command) => `pong ${command.word}`);

const wrapper = ({ children }: { children: React.ReactNode }) => <ConversationProvider>{children}</ConversationProvider>;

const renderChat = () =>
  renderHook(() => ({ chat: useScreenChat<Command>({ parse, execute, helpText: 'Puede decir: ping algo' }), convo: useConversation() }), {
    wrapper,
  });

const texts = (messages: { sender: string; text: string }[]) => messages.map((item) => `${item.sender}: ${item.text}`);

describe('useScreenChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds the question and the answer to the shared conversation and remembers the last reply', async () => {
    const { result } = renderChat();

    await act(async () => {
      await result.current.chat.send('ping hola');
    });

    expect(texts(result.current.convo.messages).slice(1)).toEqual(['user: ping hola', 'assistant: pong hola']);
    expect(result.current.chat.lastReply).toBe('pong hola');
  });

  it('sends the typed text and clears the field', async () => {
    const { result } = renderChat();
    act(() => result.current.chat.setInputText('ping escrito'));

    await act(async () => {
      await result.current.chat.send();
    });

    expect(execute).toHaveBeenCalledWith({ type: 'ping', word: 'escrito' });
    expect(result.current.chat.inputText).toBe('');
  });

  it('answers with the help text and runs nothing when the message is not understood', async () => {
    const { result } = renderChat();

    await act(async () => {
      await result.current.chat.send('hola');
    });

    expect(execute).not.toHaveBeenCalled();
    expect(result.current.chat.lastReply).toBe('Puede decir: ping algo');
    expect(texts(result.current.convo.messages).slice(1)).toEqual(['user: hola', 'assistant: Puede decir: ping algo']);
  });

  it('turns a failure into a reply and stops loading', async () => {
    execute.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderChat();

    await act(async () => {
      await result.current.chat.send('ping x');
    });

    expect(result.current.chat.lastReply).toBe('No pude completar eso. Inténtelo de nuevo.');
    expect(result.current.chat.loading).toBe(false);
  });

  it('ignores empty messages', async () => {
    const { result } = renderChat();

    await act(async () => {
      await result.current.chat.send('   ');
    });

    expect(result.current.convo.messages).toHaveLength(1);
    expect(parse).not.toHaveBeenCalled();
  });

  it('shows loading while a command runs and ignores a second send meanwhile', async () => {
    let resolveExecute!: (value: string) => void;
    execute.mockReturnValueOnce(new Promise((resolve) => (resolveExecute = resolve)));
    const { result } = renderChat();

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.chat.send('ping uno');
    });
    expect(result.current.chat.loading).toBe(true);

    await act(async () => {
      await result.current.chat.send('ping dos');
    });
    expect(execute).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveExecute('pong uno');
      await pending;
    });
    expect(result.current.chat.loading).toBe(false);
  });
});
