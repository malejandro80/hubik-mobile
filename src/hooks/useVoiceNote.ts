import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { transcribeVoiceNote, VOICE_NOTE_MIME_TYPE } from '../services/chatApi';
import { useLabels } from './useLabels';
import { useVoiceRecorder } from './useVoiceRecorder';

export function useVoiceNote(onTranscript: (text: string) => void) {
  const { chat, common } = useLabels();
  const recorder = useVoiceRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const { status } = recorder.state;

  const onMicPress = useCallback(async () => {
    if (status === 'processing' || transcribing) return;

    if (status === 'recording') {
      const result = await recorder.stop();
      if (!result) return;
      setTranscribing(true);
      try {
        const data = await FileSystem.readAsStringAsync(result.uri, { encoding: FileSystem.EncodingType.Base64 });
        onTranscript(await transcribeVoiceNote({ data, mimeType: VOICE_NOTE_MIME_TYPE }));
      } catch {
        Alert.alert(chat.voiceNoteFailedTitle, chat.voiceNoteFailedMessage, [{ text: common.understood }]);
      } finally {
        setTranscribing(false);
      }
      return;
    }

    try {
      await recorder.start();
    } catch {
      Alert.alert(chat.micNotAvailableTitle, chat.micNotAvailableMessage, [{ text: common.understood }]);
    }
  }, [status, transcribing, recorder, onTranscript, chat, common]);

  return { onMicPress, isRecording: status === 'recording', busy: status === 'processing' || transcribing };
}
