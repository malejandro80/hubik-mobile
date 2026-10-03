import { httpPostJson } from './httpFacade.ts';

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

export interface GeminiGenerateJsonParams<T> {
  model: string;
  key: string;
  prompt: string;
  systemInstruction?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  logTag?: string;
  parser?: (text: string) => T | null;
}

export interface GeminiGenerateTextParams {
  model: string;
  key: string;
  prompt: string;
  systemInstruction?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  logTag?: string;
}

export interface GeminiEmbedParams {
  key: string;
  text: string;
  taskType: EmbeddingTaskType;
  dimensions?: number;
  logTag?: string;
}

function normalizeEmbedding(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? values.map((v) => v / norm) : values;
}

export async function geminiGenerateJson<T>(params: GeminiGenerateJsonParams<T>): Promise<T | null> {
  const logPrefix = params.logTag ? `[${params.logTag}] ` : '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.key}`;
  const body = {
    contents: [{ parts: [{ text: params.prompt }] }],
    ...(params.systemInstruction ? { systemInstruction: { parts: [{ text: params.systemInstruction }] } } : {}),
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  try {
    const response = await httpPostJson<any>(url, body, {
      timeoutMs: params.timeoutMs,
      signal: params.signal,
    });

    if (!response.ok) {
      console.warn(`${logPrefix}Gemini generateContent responded ${response.status}: ${response.errorText || ''}`);
      return null;
    }

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || !text.trim()) {
      return null;
    }

    if (params.parser) {
      return params.parser(text);
    }

    return JSON.parse(text) as T;
  } catch (error) {
    console.warn(`${logPrefix}Gemini generateContent request failed:`, error);
    return null;
  }
}

export async function geminiGenerateText(params: GeminiGenerateTextParams): Promise<string | null> {
  const logPrefix = params.logTag ? `[${params.logTag}] ` : '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.key}`;
  const body = {
    contents: [{ parts: [{ text: params.prompt }] }],
    ...(params.systemInstruction ? { systemInstruction: { parts: [{ text: params.systemInstruction }] } } : {}),
  };

  try {
    const response = await httpPostJson<any>(url, body, {
      timeoutMs: params.timeoutMs,
      signal: params.signal,
    });

    if (!response.ok) {
      console.warn(`${logPrefix}Gemini generateText responded ${response.status}: ${response.errorText || ''}`);
      return null;
    }

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch (error) {
    console.warn(`${logPrefix}Gemini generateText request failed:`, error);
    return null;
  }
}

export async function geminiEmbedText(params: GeminiEmbedParams): Promise<number[] | null> {
  const logPrefix = params.logTag ? `[${params.logTag}] ` : '';
  const targetDimensions = params.dimensions ?? 768;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${params.key}`;
  const body = {
    model: 'models/gemini-embedding-001',
    content: { parts: [{ text: params.text }] },
    taskType: params.taskType,
    outputDimensionality: targetDimensions,
  };

  try {
    const response = await httpPostJson<any>(url, body);
    if (!response.ok) {
      console.warn(`${logPrefix}Gemini embedContent responded ${response.status}: ${response.errorText || ''}`);
      return null;
    }

    const values = response.data?.embedding?.values;
    if (!Array.isArray(values) || values.length !== targetDimensions) {
      console.warn(`${logPrefix}unexpected embedding shape from Gemini:`, values?.length);
      return null;
    }

    return normalizeEmbedding(values);
  } catch (error) {
    console.warn(`${logPrefix}embedding generation failed:`, error);
    return null;
  }
}
