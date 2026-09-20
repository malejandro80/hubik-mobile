import { AudioPayload } from './audioPayload.ts';

// Groq-hosted Whisper (whisper-large-v3-turbo) replaces the Gemini-based audio path from
// RFC 005/008: gemini-2.5-flash-lite 404s on audio input, and gemini-2.5-flash's free-tier quota
// is only 20 requests/day per project - shared with property-describe, trivially exhausted.
// Groq's free tier (2,000 requests/day, 28,800 audio-seconds/day) fits this workload far better,
// and Whisper is purpose-built for transcription. This function ONLY transcribes - no system
// instruction, no field extraction - the transcript flows into the same heuristic + Gemini-lite
// text cascade chat-query/property-intake already run for typed messages (RFC 008 Phase 1).

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function transcribeAudio(audio: AudioPayload, groqKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', base64ToBlob(audio.data, audio.mimeType), 'recording.m4a');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${groqKey}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[groqAudio] Groq transcription request failed (${res.status}): ${body}`);
    throw new Error(`Groq transcription request failed (${res.status})`);
  }

  const data = await res.json();
  const transcript = typeof data?.text === 'string' ? data.text.trim() : '';
  if (!transcript) {
    throw new Error('No pude entender la nota de voz');
  }
  return transcript;
}
