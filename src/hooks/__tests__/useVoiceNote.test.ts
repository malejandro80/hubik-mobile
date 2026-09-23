import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useVoiceNote } from '../useVoiceNote';
import { transcribeVoiceNote } from '../../services/chatApi';

const mockStart = jest.fn();
const mockStop = jest.fn();
let mockStatus = 'idle';

jest.mock('../useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({ state: { status: mockStatus }, start: mockStart, stop: mockStop, cancel: jest.fn() }),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('YmFzZTY0'),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('../../services/chatApi', () => ({
  transcribeVoiceNote: jest.fn(),
  VOICE_NOTE_MIME_TYPE: 'audio/mp4',
}));

describe('useVoiceNote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = 'idle';
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('starts recording on the first press', async () => {
    const { result } = renderHook(() => useVoiceNote(jest.fn()));

    await act(() => result.current.onMicPress());

    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('stops, transcribes and hands over the text on the second press', async () => {
    mockStatus = 'recording';
    mockStop.mockResolvedValue({ uri: 'file:///nota.m4a', durationMs: 1200 });
    (transcribeVoiceNote as jest.Mock).mockResolvedValue('¿Tiene garaje?');
    const onTranscript = jest.fn();
    const { result } = renderHook(() => useVoiceNote(onTranscript));

    expect(result.current.isRecording).toBe(true);
    await act(() => result.current.onMicPress());

    expect(transcribeVoiceNote).toHaveBeenCalledWith({ data: 'YmFzZTY0', mimeType: 'audio/mp4' });
    expect(onTranscript).toHaveBeenCalledWith('¿Tiene garaje?');
    expect(result.current.busy).toBe(false);
  });

  it('explains a failed transcription and sends nothing', async () => {
    mockStatus = 'recording';
    mockStop.mockResolvedValue({ uri: 'file:///nota.m4a', durationMs: 1200 });
    (transcribeVoiceNote as jest.Mock).mockRejectedValue(new Error('offline'));
    const onTranscript = jest.fn();
    const { result } = renderHook(() => useVoiceNote(onTranscript));

    await act(() => result.current.onMicPress());

    expect(onTranscript).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('No pudimos entender la nota de voz', expect.any(String), expect.any(Array));
  });

  it('tells the user when the microphone is not available', async () => {
    mockStart.mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() => useVoiceNote(jest.fn()));

    await act(() => result.current.onMicPress());

    expect(Alert.alert).toHaveBeenCalledWith('Micrófono no disponible', expect.any(String), expect.any(Array));
  });

  it('ignores presses while the recorder is still saving the note', async () => {
    mockStatus = 'processing';
    const { result } = renderHook(() => useVoiceNote(jest.fn()));

    expect(result.current.busy).toBe(true);
    await act(() => result.current.onMicPress());

    expect(mockStart).not.toHaveBeenCalled();
    expect(mockStop).not.toHaveBeenCalled();
  });
});
