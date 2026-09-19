export interface AudioPayload {
  data: string; // base64-encoded recording, forwarded to the transcription vendor, never persisted
  mimeType: string;
}

export function isAudioPayload(value: any): value is AudioPayload {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.data === 'string' &&
    value.data.trim() !== '' &&
    typeof value.mimeType === 'string' &&
    value.mimeType.trim() !== ''
  );
}
