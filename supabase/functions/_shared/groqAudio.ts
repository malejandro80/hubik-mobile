import { AudioPayload } from './audioPayload.ts';
import { groqTranscribeAudio } from './groqFacade.ts';

export async function transcribeAudio(audio: AudioPayload, groqKey: string): Promise<string> {
  return groqTranscribeAudio({
    key: groqKey,
    audio,
    logTag: 'groqAudio',
  });
}
