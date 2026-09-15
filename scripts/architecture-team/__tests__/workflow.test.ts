import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runArchitecturePipeline } from '../index';
import type { Role, RoleProvider } from '../types';

class FullProvider implements RoleProvider {
  async generate(role: Role, intent: string): Promise<string> {
    return `## ${role}: notes for ${intent}`;
  }
}

class EmptySpecProvider implements RoleProvider {
  async generate(role: Role, intent: string, prior: string): Promise<string> {
    if (role === 'spec') return prior ? '' : '';
    return `## ${role}: notes for ${intent}`;
  }
}

function tmpBase(): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'archteam-wf-'));
  fs.mkdirSync(path.join(base, 'specs'), { recursive: true });
  fs.mkdirSync(path.join(base, 'docs', 'adr'), { recursive: true });
  return base;
}

describe('runArchitecturePipeline', () => {
  it('reaches APPROVED and writes artifacts on the nominal path', async () => {
    const base = tmpBase();
    const state = await runArchitecturePipeline('auth pipeline', {
      provider: new FullProvider(),
      baseDir: base,
    });
    expect(state.gatekeeperStatus).toBe('APPROVED');
    expect(state.visited).toEqual([
      'lead',
      'systems',
      'spec',
      'security',
      'qa',
      'gatekeeper',
      'writeArtifacts',
    ]);
    expect(fs.existsSync(path.join(base, state.specPath))).toBe(true);
    expect(fs.existsSync(path.join(base, state.adrPath))).toBe(true);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it('escalates after exhausting the revision loop when spec stays empty', async () => {
    const base = tmpBase();
    const state = await runArchitecturePipeline('broken spec', {
      provider: new EmptySpecProvider(),
      baseDir: base,
    });
    expect(state.gatekeeperStatus).toBe('ESCALATED');
    expect(state.iteration).toBe(2);
    expect(state.visited[state.visited.length - 1]).toBe('escalate');
    fs.rmSync(base, { recursive: true, force: true });
  });
});
