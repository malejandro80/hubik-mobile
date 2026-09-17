export interface AudioPayload {
  data: string; // base64-encoded recording, forwarded to Gemini and never persisted
  mimeType: string;
}

export interface GeminiAudioResult {
  transcript: string;
  extracted: Record<string, any>;
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

/**
 * Sends a voice note directly to Gemini for native audio understanding: one call
 * both transcribes the note and extracts whatever structured fields the caller's
 * systemInstruction asks for (Gemini must be told to return a "transcript" key).
 */
export async function transcribeAndExtractFromAudio(
  audio: AudioPayload,
  systemInstruction: string,
  geminiKey: string
): Promise<GeminiAudioResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ inlineData: { mimeType: audio.mimeType, data: audio.data } }],
          },
        ],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini audio request failed (${res.status})`);
  }

  const geminiData = await res.json();
  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no content for the voice note');
  }

  const parsed = JSON.parse(text);
  if (typeof parsed.transcript !== 'string' || !parsed.transcript.trim()) {
    throw new Error('No pude entender la nota de voz');
  }

  const { transcript, ...extracted } = parsed;
  return { transcript: transcript.trim(), extracted };
}
