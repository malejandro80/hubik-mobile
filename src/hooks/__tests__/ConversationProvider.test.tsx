import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { ConversationProvider } from '../ConversationProvider';
import { useConversation } from '../useConversation';
import { ChatMessage } from '../../types/property';

let mockStatus = 'signedIn';

jest.mock('../useAuth', () => ({
  useAuth: () => ({ status: mockStatus }),
}));

const message = (id: string, text: string): ChatMessage => ({
  id,
  sender: 'user',
  text,
  timestamp: 'ahora',
});

const wrapper = ({ children }: { children: React.ReactNode }) => <ConversationProvider>{children}</ConversationProvider>;

const renderShared = () =>
  renderHook(() => ({ first: useConversation(), second: useConversation() }), { wrapper });

describe('ConversationProvider', () => {
  beforeEach(() => {
    mockStatus = 'signedIn';
  });

  it('starts empty so the start screen can show', () => {
    const { result } = renderShared();

    expect(result.current.first.messages).toEqual([]);
  });

  it('shares the same messages with every consumer', () => {
    const { result } = renderShared();

    act(() => result.current.first.appendMessages(message('m1', 'hola')));

    expect(result.current.second.messages.map((item) => item.id)).toEqual(['m1']);
  });

  it('keeps every message when several are appended in a row', () => {
    const { result } = renderShared();

    act(() => {
      result.current.first.appendMessages(message('m1', 'uno'));
      result.current.second.appendMessages(message('m2', 'dos'), message('m3', 'tres'));
    });

    expect(result.current.first.messages.map((item) => item.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('replaces the whole history with setMessages', () => {
    const { result } = renderShared();

    act(() => result.current.first.setMessages([message('only', 'solo')]));

    expect(result.current.second.messages.map((item) => item.id)).toEqual(['only']);
  });

  it('goes back to empty on reset', () => {
    const { result } = renderShared();
    act(() => result.current.first.appendMessages(message('m1', 'hola')));

    act(() => result.current.first.reset());

    expect(result.current.second.messages.map((item) => item.id)).toEqual([]);
  });

  it('clears the conversation when the user signs out', () => {
    const { result, rerender } = renderShared();
    act(() => result.current.first.appendMessages(message('m1', 'ana@correo.com')));

    mockStatus = 'signedOut';
    rerender({});

    expect(result.current.first.messages.map((item) => item.id)).toEqual([]);
  });

  it('keeps an anonymous conversation while signed out and while the session loads', () => {
    mockStatus = 'signedOut';
    const { result, rerender } = renderShared();
    act(() => result.current.first.appendMessages(message('m1', 'busco un piso')));

    mockStatus = 'loading';
    rerender({});
    mockStatus = 'signedOut';
    rerender({});

    expect(result.current.first.messages.map((item) => item.id)).toEqual(['m1']);
  });
});

describe('useConversation without a provider', () => {
  it('still works on its own instead of throwing', () => {
    const { result } = renderHook(() => useConversation());

    act(() => result.current.appendMessages(message('m1', 'hola')));

    expect(result.current.messages.map((item) => item.id)).toEqual(['m1']);

    act(() => result.current.reset());
    expect(result.current.messages.map((item) => item.id)).toEqual([]);
  });
});
