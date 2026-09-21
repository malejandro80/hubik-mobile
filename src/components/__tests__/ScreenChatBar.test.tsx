import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScreenChatBar, ScreenChatBarProps } from '../ScreenChatBar';

const buildChat = (overrides: Partial<ScreenChatBarProps['chat']> = {}): ScreenChatBarProps['chat'] => ({
  inputText: '',
  setInputText: jest.fn(),
  send: jest.fn().mockResolvedValue(undefined),
  loading: false,
  lastReply: null,
  ...overrides,
});

const renderBar = (chat = buildChat(), onOpenConversation = jest.fn()) => ({
  chat,
  onOpenConversation,
  ...render(<ScreenChatBar chat={chat} onOpenConversation={onOpenConversation} />),
});

describe('ScreenChatBar', () => {
  it('shows the input with a placeholder, without a microphone, and no reply strip yet', () => {
    const { getByPlaceholderText, queryByLabelText, queryByText } = renderBar();

    expect(getByPlaceholderText('Escriba aquí lo que necesita...')).toBeTruthy();
    expect(queryByLabelText('Hablar por micrófono')).toBeNull();
    expect(queryByText('Ver conversación')).toBeNull();
  });

  it('updates the typed text and sends it', () => {
    const { chat, getByPlaceholderText, rerender, getByLabelText } = renderBar();

    fireEvent.changeText(getByPlaceholderText('Escriba aquí lo que necesita...'), 'agrega a ana@correo.com');
    expect(chat.setInputText).toHaveBeenCalledWith('agrega a ana@correo.com');

    const withText = buildChat({ inputText: 'agrega a ana@correo.com' });
    rerender(<ScreenChatBar chat={withText} onOpenConversation={jest.fn()} />);
    fireEvent.press(getByLabelText('Enviar consulta'));

    expect(withText.send).toHaveBeenCalledWith('agrega a ana@correo.com');
  });

  it('shows the last reply and a way to open the whole conversation', () => {
    const { getByText, getByLabelText, onOpenConversation } = renderBar(
      buildChat({ lastReply: 'Invitación guardada. Será agente en cuanto inicie sesión con ese correo.' })
    );

    expect(getByText('Invitación guardada. Será agente en cuanto inicie sesión con ese correo.')).toBeTruthy();
    fireEvent.press(getByLabelText('Abrir la conversación completa'));

    expect(onOpenConversation).toHaveBeenCalledTimes(1);
  });
});
