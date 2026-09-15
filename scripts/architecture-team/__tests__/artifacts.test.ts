import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  sanitizeIntent,
  resolveArtifactPaths,
  writeArtifacts,
} from '../artifacts';
import type { ArchitectureState } from '../types';

describe('sanitizeIntent', () => {
  it('kebab-cases and strips unsafe characters', () => {
    expect(sanitizeIntent('  Auth Pipeline v2!  ')).toBe('auth-pipeline-v2');
    expect(sanitizeIntent('../evil')).toBe('evil');
    expect(sanitizeIntent('   ')).toBe('untitled');
  });
});

describe('resolveArtifactPaths', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archteam-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns sequential padded paths in an empty project', () => {
    const paths = resolveArtifactPaths('auth pipeline', tmp);
    expect(paths.specPath).toBe('specs/001-auth-pipeline.md');
    expect(paths.adrPath).toBe('docs/adr/0001-auth-pipeline.md');
  });

  it('continues from the max existing sequence', () => {
    fs.mkdirSync(path.join(tmp, 'specs'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'docs', 'adr'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'specs', '002-existing.md'), '# x');
    const paths = resolveArtifactPaths('new', tmp);
    expect(paths.specPath).toBe('specs/003-new.md');
    expect(paths.adrPath).toBe('docs/adr/0001-new.md');
  });
});

describe('writeArtifacts', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archteam-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('writes spec and adr files on disk', () => {
    const state: ArchitectureState = {
      intent: 'auth pipeline',
      topologyNotes: 'router guard in app/_layout.tsx',
      systemsApproved: true,
      specDraft: '# Spec draft content',
      securityFindings: 'JWT in secure-store',
      securityApproved: true,
      qaPlan: 'RNTL suites',
      gatekeeperStatus: 'APPROVED',
      iteration: 1,
      feedback: [],
      specPath: 'specs/001-auth-pipeline.md',
      adrPath: 'docs/adr/0001-auth-pipeline.md',
      visited: [],
    };
    writeArtifacts(state, tmp);
    const spec = fs.readFileSync(path.join(tmp, state.specPath), 'utf8');
    const adr = fs.readFileSync(path.join(tmp, state.adrPath), 'utf8');
    expect(spec).toContain('# Spec draft content');
    expect(adr).toContain('ADR 0001');
    expect(adr).toContain('auth-pipeline');
  });
});
