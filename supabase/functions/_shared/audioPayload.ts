export interface AudioPayload {
  data: string;
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
