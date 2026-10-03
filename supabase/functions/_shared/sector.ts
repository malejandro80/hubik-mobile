import { normalizePlace } from './cityMatch.ts';
import { GEMINI_EXTRACTION_MODEL, sectorInstruction } from './prompts.ts';
import { geminiGenerateUrl } from './searchAnswerConstants.ts';
import { SECTOR_MAX_LENGTH, SECTOR_MIN_LENGTH, SECTOR_SOURCE_SEPARATOR, SECTOR_TIMEOUT_MS } from './sectorConstants.ts';

export interface SectorSource {
  address?: string | null;
  title?: string | null;
  city?: string | null;
}

export function groundSector(candidate: unknown, source: SectorSource): string | null {
  if (typeof candidate !== 'string') return null;
  const sector = candidate.trim().replace(/\s+/g, ' ');
  if (sector.length < SECTOR_MIN_LENGTH || sector.length > SECTOR_MAX_LENGTH) return null;

  const normalized = normalizePlace(sector);
  if (source.city && normalizePlace(source.city) === normalized) return null;

  const written = normalizePlace([source.address, source.title].filter(Boolean).join(SECTOR_SOURCE_SEPARATOR));
  return written.includes(normalized) ? sector : null;
}

export async function extractSector(source: SectorSource, geminiKey: string): Promise<string | null> {
  if (!source.address && !source.title) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SECTOR_TIMEOUT_MS);
  try {
    const res = await fetch(geminiGenerateUrl(GEMINI_EXTRACTION_MODEL, geminiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: JSON.stringify(source) }] }],
        systemInstruction: { parts: [{ text: sectorInstruction() }] },
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      console.warn(`[sector] Gemini responded ${res.status}`);
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === 'string' ? groundSector(JSON.parse(text)?.sector, source) : null;
  } catch (error) {
    console.warn('[sector] extraction failed:', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
