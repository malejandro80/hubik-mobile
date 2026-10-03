import { normalizePlace } from './cityMatch.ts';
import { geminiGenerateJson } from './geminiFacade.ts';
import { GEMINI_EXTRACTION_MODEL, sectorInstruction } from './prompts.ts';
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

  return geminiGenerateJson<string | null>({
    model: GEMINI_EXTRACTION_MODEL,
    key: geminiKey,
    prompt: JSON.stringify(source),
    systemInstruction: sectorInstruction(),
    timeoutMs: SECTOR_TIMEOUT_MS,
    logTag: 'sector',
    parser: (text) => groundSector(JSON.parse(text)?.sector, source),
  });
}
