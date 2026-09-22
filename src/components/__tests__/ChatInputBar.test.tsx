import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ChatInputBar } from '../ChatInputBar';

describe('ChatInputBar Component', () => {
  it('renders with placeholder and mic button when empty', () => {
    const handleSend = jest.fn();
    const handleMic = jest.fn();
    const handleChangeText = jest.fn();

    const { getByPlaceholderText, getByLabelText, getByText } = render(
      <ChatInputBar
        value=""
        onChangeText={handleChangeText}
        onSend={handleSend}
        onMicPress={handleMic}
        placeholder="Escriba su consulta aquí..."
      />
    );

    expect(getByPlaceholderText('Escriba su consulta aquí...')).toBeTruthy();
    const micButton = getByLabelText('Hablar por micrófono');
    expect(micButton).toBeTruthy();
    expect(getByText('Enviar')).toBeTruthy();

    fireEvent.press(micButton);
    expect(handleMic).toHaveBeenCalledTimes(1);
    expect(handleSend).not.toHaveBeenCalled();
  });

  it('renders send arrow button when text is present and sends query', () => {
    const handleSend = jest.fn();
    const handleMic = jest.fn();
    const handleChangeText = jest.fn();

    const { getByLabelText } = render(
      <ChatInputBar
        value="Piso en Salamanca"
        onChangeText={handleChangeText}
        onSend={handleSend}
        onMicPress={handleMic}
        placeholder="Escriba su consulta aquí..."
      />
    );

    const sendButton = getByLabelText('Enviar consulta');
    expect(sendButton).toBeTruthy();

    fireEvent.press(sendButton);
    expect(handleSend).toHaveBeenCalledWith('Piso en Salamanca');
    expect(handleMic).not.toHaveBeenCalled();
  });

  it('triggers onSend upon submitting editing from keyboard', () => {
    const handleSend = jest.fn();
    const handleChangeText = jest.fn();

    const { getByPlaceholderText } = render(
      <ChatInputBar
        value="Ático con terraza"
        onChangeText={handleChangeText}
        onSend={handleSend}
      />
    );

    const input = getByPlaceholderText('Escriba su consulta aquí...');
    fireEvent(input, 'submitEditing');

    expect(handleSend).toHaveBeenCalledWith('Ático con terraza');
  });

  it('shows a stop control and disables typing while recording a voice note', () => {
    const handleSend = jest.fn();
    const handleMic = jest.fn();
    const handleChangeText = jest.fn();

    const { getByLabelText, getByPlaceholderText } = render(
      <ChatInputBar
        value=""
        onChangeText={handleChangeText}
        onSend={handleSend}
        onMicPress={handleMic}
        isRecording={true}
        placeholder="Escriba su consulta aquí..."
      />
    );

    const stopButton = getByLabelText('Detener grabación de nota de voz');
    expect(stopButton).toBeTruthy();
    expect(stopButton.props.accessibilityState.selected).toBe(true);
    expect(getByPlaceholderText('Escriba su consulta aquí...').props.editable).toBe(false);

    fireEvent.press(stopButton);
    expect(handleMic).toHaveBeenCalledTimes(1);
    expect(handleSend).not.toHaveBeenCalled();
  });

  it('disables input and button when loading is true', () => {
    const handleSend = jest.fn();
    const handleChangeText = jest.fn();

    const { getByLabelText } = render(
      <ChatInputBar
        value="Searching..."
        onChangeText={handleChangeText}
        onSend={handleSend}
        loading={true}
      />
    );

    const sendButton = getByLabelText('Enviar consulta');
    expect(sendButton.props.accessibilityState.busy).toBe(true);
  });
});

describe('ChatInputBar without a microphone', () => {
  it('shows a disabled send button instead of a microphone when the field is empty', () => {
    const onSend = jest.fn();
    const { getByLabelText, queryByLabelText } = render(<ChatInputBar value="" onChangeText={jest.fn()} onSend={onSend} />);

    expect(queryByLabelText('Hablar por micrófono')).toBeNull();
    const button = getByLabelText('Enviar consulta');
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends normally once there is text', () => {
    const onSend = jest.fn();
    const { getByLabelText } = render(<ChatInputBar value=" hola " onChangeText={jest.fn()} onSend={onSend} />);

    fireEvent.press(getByLabelText('Enviar consulta'));

    expect(onSend).toHaveBeenCalledWith('hola');
  });
});
