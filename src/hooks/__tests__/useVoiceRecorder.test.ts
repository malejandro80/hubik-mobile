import { act, renderHook } from '@testing-library/react-native';
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { MAX_RECORDING_MS, useVoiceRecorder } from '../useVoiceRecorder';

const mockRecorder = {
  prepareToRecordAsync: jest.fn(),
  record: jest.fn(),
  stop: jest.fn(),
  uri: 'file://note.m4a',
  currentTime: 4.2,
};

jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: jest.fn(),
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: jest.fn(() => mockRecorder),
}));

describe('useVoiceRecorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (setAudioModeAsync as jest.Mock).mockResolvedValue(undefined);
    mockRecorder.prepareToRecordAsync.mockResolvedValue(undefined);
    mockRecorder.record.mockReturnValue(undefined);
    mockRecorder.stop.mockResolvedValue(undefined);
    mockRecorder.uri = 'file://note.m4a';
    mockRecorder.currentTime = 4.2;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts recording after requesting mic permission', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(requestRecordingPermissionsAsync).toHaveBeenCalled();
    expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
    expect(mockRecorder.record).toHaveBeenCalled();
    expect(result.current.state.status).toBe('recording');
  });

  it('throws and stays idle when mic permission is denied', async () => {
    (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    const { result } = renderHook(() => useVoiceRecorder());

    await act(async () => {
      await expect(result.current.start()).rejects.toThrow('MIC_PERMISSION_DENIED');
    });

    expect(result.current.state.status).toBe('idle');
    expect(mockRecorder.record).not.toHaveBeenCalled();
  });

  it('stops recording and returns the local uri with duration', async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    await act(async () => {
      await result.current.start();
    });

    let stopResult;
    await act(async () => {
      stopResult = await result.current.stop();
    });

    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(stopResult).toEqual({ uri: 'file://note.m4a', durationMs: 4200 });
    expect(result.current.state.status).toBe('idle');
  });

  it('returns null when stopping with no active recording', async () => {
    const { result } = renderHook(() => useVoiceRecorder());

    let stopResult;
    await act(async () => {
      stopResult = await result.current.stop();
    });

    expect(stopResult).toBeNull();
    expect(mockRecorder.stop).not.toHaveBeenCalled();
  });

  it('auto-stops once MAX_RECORDING_MS is reached', async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      jest.advanceTimersByTime(MAX_RECORDING_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(result.current.state.status).toBe('idle');
  });

  it('cancel discards the recording without returning a result', async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.cancel();
    });

    expect(result.current.state.status).toBe('idle');
    expect(mockRecorder.stop).toHaveBeenCalled();
  });
});
