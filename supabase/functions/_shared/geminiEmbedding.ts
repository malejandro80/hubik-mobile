import { geminiEmbedText } from './geminiFacade.ts';

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

const EMBEDDING_DIMENSIONS = 768;

export async function embedText(
  text: string,
  geminiKey: string,
  taskType: EmbeddingTaskType
): Promise<number[] | null> {
  return geminiEmbedText({
    key: geminiKey,
    text,
    taskType,
    dimensions: EMBEDDING_DIMENSIONS,
    logTag: 'geminiEmbedding',
  });
}
