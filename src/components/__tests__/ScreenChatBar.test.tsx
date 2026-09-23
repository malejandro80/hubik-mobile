import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ScreenChatBar, ScreenChatBarProps } from '../ScreenChatBar';
import { transcribeVoiceNote } from '../../services/chatApi';

const mockStop = jest.fn();
let mockRecorderStatus = 'idle';

jest.mock('../../hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({ state: { status: mockRecorderStatus }, start: jest.fn(), stop: mockStop, cancel: jest.fn() }),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('YmFzZTY0'),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('../../services/chatApi', () => ({
  transcribeVoiceNote: jest.fn(),
  VOICE_NOTE_MIME_TYPE: 'audio/mp4',
}));

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
  it('shows the same input as every screen, microphone included, and no reply strip yet', () => {
    const { getByPlaceholderText, getByLabelText, queryByText } = renderBar();

    expect(getByPlaceholderText('Escriba su consulta aquí...')).toBeTruthy();
    expect(getByLabelText('Hablar por micrófono')).toBeTruthy();
    expect(queryByText('Ver conversación')).toBeNull();
  });

  it('updates the typed text and sends it', () => {
    const { chat, getByPlaceholderText, rerender, getByLabelText } = renderBar();

    fireEvent.changeText(getByPlaceholderText('Escriba su consulta aquí...'), 'agrega a ana@correo.com');
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

  it('handles a spoken request exactly like a typed one', async () => {
    mockRecorderStatus = 'recording';
    mockStop.mockResolvedValue({ uri: 'file:///nota.m4a', durationMs: 900 });
    (transcribeVoiceNote as jest.Mock).mockResolvedValue('agrega a ana@correo.com');
    const { chat, getByLabelText } = renderBar();

    fireEvent.press(getByLabelText('Detener grabación de nota de voz'));

    await waitFor(() => expect(chat.send).toHaveBeenCalledWith('agrega a ana@correo.com'));
    mockRecorderStatus = 'idle';
  });
});
