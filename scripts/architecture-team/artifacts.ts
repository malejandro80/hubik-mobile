import * as fs from 'fs';
import path from 'path';
import type { ArchitectureState } from './types';

export function sanitizeIntent(intent: string): string {
  const cleaned = intent
    .trim()
    .toLowerCase()
    .replace(/\.\./g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return cleaned || 'untitled';
}

export function nextSequence(
  dir: string,
  _width: number,
  pattern: RegExp
): number {
  let max = 0;
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      const match = file.match(pattern);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    }
  }
  return max + 1;
}

export interface ArtifactPaths {
  specPath: string;
  adrPath: string;
}

export function resolveArtifactPaths(
  intent: string,
  baseDir: string
): ArtifactPaths {
  const title = sanitizeIntent(intent);
  const specSeq = nextSequence(
    path.join(baseDir, 'specs'),
    3,
    /^(\d{3})-.*\.md$/
  );
  const adrSeq = nextSequence(
    path.join(baseDir, 'docs', 'adr'),
    4,
    /^(\d{4})-.*\.md$/
  );
  return {
    specPath: `specs/${String(specSeq).padStart(3, '0')}-${title}.md`,
    adrPath: `docs/adr/${String(adrSeq).padStart(4, '0')}-${title}.md`,
  };
}

export function renderSpecFile(state: ArchitectureState): string {
  const title = path.basename(state.specPath, '.md');
  return [
    `# Spec: ${title}`,
    '',
    `- **Intent**: ${state.intent}`,
    '',
    `## Topology Notes`,
    state.topologyNotes,
    '',
    `## Proposal Draft`,
    state.specDraft,
    '',
    `## QA Plan`,
    state.qaPlan,
  ].join('\n');
}

export function renderAdrFile(state: ArchitectureState): string {
  return [
    `# ADR ${path.basename(state.adrPath, '.md').slice(0, 4)}: ${state.intent}`,
    '',
    `- **Status**: Accepted`,
    `- **Related Spec**: ${state.specPath}`,
    '',
    '---',
    '',
    '## Context and Problem Statement',
    state.topologyNotes,
    '',
    '## Security Findings',
    state.securityFindings,
    '',
    '## QA Plan',
    state.qaPlan,
  ].join('\n');
}

export function writeArtifacts(
  state: ArchitectureState,
  baseDir: string = process.cwd()
): ArtifactPaths {
  const specFullPath = path.join(baseDir, state.specPath);
  const adrFullPath = path.join(baseDir, state.adrPath);

  fs.mkdirSync(path.dirname(specFullPath), { recursive: true });
  fs.mkdirSync(path.dirname(adrFullPath), { recursive: true });

  fs.writeFileSync(specFullPath, renderSpecFile(state), 'utf8');
  fs.writeFileSync(adrFullPath, renderAdrFile(state), 'utf8');

  return { specPath: state.specPath, adrPath: state.adrPath };
}
