// Shared Gemini embedding helper. `text-embedding-004` (the model this project originally used)
// was shut down by Google on 2026-01-14; `gemini-embedding-001` is the replacement, but it
// defaults to 3072 dimensions instead of 768 - the `properties.embedding` column and the
// `match_properties` HNSW index are both fixed at vector(768), so `outputDimensionality: 768` is
// required to stay compatible. Unlike the newer gemini-embedding-2, gemini-embedding-001 does NOT
// auto-renormalize non-default-dimension output, so the returned vector must be L2-normalized
// here before use (per Google's Embeddings guide, "Ensuring quality for smaller dimensions").

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

const EMBEDDING_DIMENSIONS = 768;

function normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? values.map((v) => v / norm) : values;
}

export async function embedText(
  text: string,
  geminiKey: string,
  taskType: EmbeddingTaskType
): Promise<number[] | null> {
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=' +
        geminiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      }
    );
    if (!res.ok) {
      console.warn(
        `[geminiEmbedding] Gemini embedContent responded ${res.status}: ${await res.text()}`
      );
      return null;
    }
    const data = await res.json();
    const values = data?.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
      console.warn('[geminiEmbedding] unexpected embedding shape from Gemini:', values?.length);
      return null;
    }
    return normalize(values);
  } catch (err) {
    console.warn('[geminiEmbedding] embedding generation failed:', err);
    return null;
  }
}
