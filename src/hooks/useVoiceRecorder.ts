import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

export const MAX_RECORDING_MS = 60_000;

export type VoiceRecorderStatus = 'idle' | 'recording' | 'processing';

export interface VoiceRecorderState {
  status: VoiceRecorderStatus;
}

export interface VoiceRecorderResult {
  uri: string;
  durationMs: number;
}

const INITIAL_STATE: VoiceRecorderState = { status: 'idle' };

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>(INITIAL_STATE);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecordingRef = useRef(false);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoStopTimer = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(async (): Promise<VoiceRecorderResult | null> => {
    clearAutoStopTimer();
    if (!isRecordingRef.current) return null;

    isRecordingRef.current = false;
    setState({ status: 'processing' });

    try {
      const durationMs = Math.round((recorder.currentTime ?? 0) * 1000);
      await recorder.stop();
      const uri = recorder.uri;
      setState(INITIAL_STATE);
      return uri ? { uri, durationMs } : null;
    } catch {
      setState(INITIAL_STATE);
      return null;
    }
  }, [clearAutoStopTimer, recorder]);

  const cancel = useCallback(() => {
    clearAutoStopTimer();
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setState(INITIAL_STATE);
    recorder.stop().catch(() => {});
  }, [clearAutoStopTimer, recorder]);

  const start = useCallback(async () => {
    if (isRecordingRef.current) return;

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error('MIC_PERMISSION_DENIED');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await recorder.prepareToRecordAsync();
    recorder.record();
    isRecordingRef.current = true;
    setState({ status: 'recording' });

    autoStopTimerRef.current = setTimeout(() => {
      stop();
    }, MAX_RECORDING_MS);
  }, [recorder, stop]);

  useEffect(
    () => () => {
      clearAutoStopTimer();
      if (isRecordingRef.current) {
        recorder.stop().catch(() => {});
      }
    },
    [clearAutoStopTimer, recorder]
  );

  return { state, start, stop, cancel };
}
