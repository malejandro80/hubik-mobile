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

describe('ChatInputBar attachments', () => {
  const baseProps = { value: '', onChangeText: jest.fn(), onSend: jest.fn() };
  const attachments = { onAddPhotos: jest.fn(), onPickLocation: jest.fn(), photoCount: 0, hasPin: false };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows no attachment buttons unless attachments are provided', () => {
    const { queryByLabelText } = render(<ChatInputBar {...baseProps} />);

    expect(queryByLabelText('Añadir fotos')).toBeNull();
    expect(queryByLabelText('Marcar ubicación en el mapa')).toBeNull();
  });

  it('shows the photo and location buttons and calls their handlers', () => {
    const { getByLabelText } = render(<ChatInputBar {...baseProps} attachments={attachments} />);

    fireEvent.press(getByLabelText('Añadir fotos'));
    fireEvent.press(getByLabelText('Marcar ubicación en el mapa'));

    expect(attachments.onAddPhotos).toHaveBeenCalledTimes(1);
    expect(attachments.onPickLocation).toHaveBeenCalledTimes(1);
  });

  it('shows how many photos were added and that the pin is already set', () => {
    const { getByLabelText, getByText } = render(
      <ChatInputBar {...baseProps} attachments={{ ...attachments, photoCount: 2, hasPin: true }} />
    );

    expect(getByLabelText('Añadir fotos, 2 añadidas')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByLabelText('Cambiar ubicación en el mapa, ya marcada')).toBeTruthy();
  });

  it('disables the attachment buttons while the AI is answering or a note is recording', () => {
    const { getByLabelText, rerender } = render(<ChatInputBar {...baseProps} attachments={attachments} loading />);
    fireEvent.press(getByLabelText('Añadir fotos'));
    expect(attachments.onAddPhotos).not.toHaveBeenCalled();

    rerender(<ChatInputBar {...baseProps} attachments={attachments} isRecording />);
    fireEvent.press(getByLabelText('Marcar ubicación en el mapa'));
    expect(attachments.onPickLocation).not.toHaveBeenCalled();
  });

  it('offers to order the photos only when there are at least two and a handler', () => {
    const onOrderPhotos = jest.fn();
    const { queryByLabelText, getByLabelText, rerender } = render(
      <ChatInputBar {...baseProps} attachments={{ ...attachments, onOrderPhotos, photoCount: 1 }} />
    );
    expect(queryByLabelText('Ordenar las fotos')).toBeNull();

    rerender(<ChatInputBar {...baseProps} attachments={{ ...attachments, onOrderPhotos, photoCount: 2 }} />);
    fireEvent.press(getByLabelText('Ordenar las fotos'));
    expect(onOrderPhotos).toHaveBeenCalledTimes(1);

    rerender(<ChatInputBar {...baseProps} attachments={{ ...attachments, photoCount: 3 }} />);
    expect(queryByLabelText('Ordenar las fotos')).toBeNull();
  });

  it('disables the order button while the AI is answering', () => {
    const onOrderPhotos = jest.fn();
    const { getByLabelText } = render(
      <ChatInputBar {...baseProps} loading attachments={{ ...attachments, onOrderPhotos, photoCount: 2 }} />
    );
    fireEvent.press(getByLabelText('Ordenar las fotos'));
    expect(onOrderPhotos).not.toHaveBeenCalled();
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
