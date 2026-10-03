import { httpPostFormData, httpPostJson } from './httpFacade.ts';
import { AudioPayload } from './audioPayload.ts';

export interface GroqChatJsonParams {
  key: string;
  model?: string;
  systemInstruction?: string;
  userPrompt: string;
  maxTokens?: number;
  logTag?: string;
}

export interface GroqTranscribeParams {
  key: string;
  audio: AudioPayload;
  model?: string;
  logTag?: string;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function groqChatJson<T>(params: GroqChatJsonParams): Promise<T | null> {
  const logPrefix = params.logTag ? `[${params.logTag}] ` : '';
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const messages = [
    ...(params.systemInstruction ? [{ role: 'system', content: params.systemInstruction }] : []),
    { role: 'user', content: params.userPrompt },
  ];
  const body = {
    model: params.model ?? 'qwen/qwen3.8-27b',
    messages,
    max_tokens: params.maxTokens ?? 500,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await httpPostJson<any>(url, body, {
      headers: { Authorization: `Bearer ${params.key}` },
    });

    if (!response.ok) {
      console.warn(`${logPrefix}Groq chat returned non-ok status:`, response.status);
      return null;
    }

    const content = response.data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return null;
    }

    return JSON.parse(content) as T;
  } catch (error) {
    console.warn(`${logPrefix}Groq chat error:`, error);
    return null;
  }
}

export async function groqTranscribeAudio(params: GroqTranscribeParams): Promise<string> {
  const logPrefix = params.logTag ? `[${params.logTag}] ` : '';
  const url = 'https://api.groq.com/openai/v1/audio/transcriptions';
  const formData = new FormData();
  formData.append('file', base64ToBlob(params.audio.data, params.audio.mimeType), 'recording.m4a');
  formData.append('model', params.model ?? 'whisper-large-v3-turbo');
  formData.append('response_format', 'json');

  const response = await httpPostFormData<any>(url, formData, {
    headers: { Authorization: `Bearer ${params.key}` },
  });

  if (!response.ok) {
    console.error(`${logPrefix}Groq transcription request failed (${response.status}): ${response.errorText || ''}`);
    throw new Error(`Groq transcription request failed (${response.status})`);
  }

  const transcript = typeof response.data?.text === 'string' ? response.data.text.trim() : '';
  if (!transcript) {
    throw new Error('No pude entender la nota de voz');
  }

  return transcript;
}
