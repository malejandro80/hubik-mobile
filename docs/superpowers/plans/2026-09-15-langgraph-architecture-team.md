# LangGraph Architecture Team Orchestrator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Python demo with a typed TypeScript LangGraph StateGraph that implements the Architecture Team skill end-to-end (LLM role agents + deterministic gatekeeper + bounded revision loop + `specs/`/`docs/adr/` artifact generation).

**Architecture:** A `StateGraph` (`@langchain/langgraph`) with nodes `lead → systems → spec → security → qa → gatekeeper`, a conditional edge from `gatekeeper` to `writeArtifacts` (approve), `spec` (revision, max 1 loop), or `escalate` (exit). Role nodes invoke Gemini (`@google/genai`, `gemini-2.5-flash`) through a `RoleProvider` interface with a deterministic offline fallback. The gatekeeper is deterministic and validates DoD slices.

**Tech Stack:** TypeScript, `@langchain/langgraph`, `@google/genai`, `dotenv`, `tsx` (runtime), Jest + jest-expo.

**Working directory:** `/Users/miguel/Desktop/programacion/repo-agent-feature` (git worktree, branch `feature/auth-pipeline`).

**Reference specs:** `specs/003-langgraph-architecture-team.md`, `docs/adr/0002-langgraph-architecture-team.md`.

---

## File Structure

New files under `scripts/architecture-team/`:

- `types.ts` — `ArchitectureState`, `Role`, `RoleProvider`, `GatekeeperStatus`.
- `gatekeeper.ts` — `evaluateGatekeeper()`, `routeAfterGatekeeper()` (pure, no I/O).
- `artifacts.ts` — `sanitizeIntent()`, `nextSequence()`, `resolveArtifactPaths()`, `renderSpecFile()`, `renderAdrFile()`, `writeArtifacts()`.
- `llm.ts` — `ROLE_SYSTEM_PROMPTS`, `GeminiRoleProvider`, `fallbackText()`.
- `agents.ts` — `createNodes(provider)` returning the 5 role node functions.
- `index.ts` — `StateAnnotation`, `compileGraph(deps)`, `runArchitecturePipeline(intent, deps)`, CLI `main()`.
- `__tests__/gatekeeper.test.ts`, `__tests__/artifacts.test.ts`, `__tests__/llm.test.ts`, `__tests__/workflow.test.ts`.

Modified files:

- `package.json` — add deps (`@langchain/langgraph`, `@google/genai`, `dotenv`), devDeps (`tsx`, `@types/node`), script `"arch-team"`.
- `jest.config.js` — extend `transformIgnorePatterns` with `@langchain|@google`.
- Delete `scripts/architecture-team/run.py`.

---

### Task 1: Dependencies, npm script, Jest transform config

**Files:**
- Modify: `package.json`
- Modify: `jest.config.js`

- [ ] **Step 1: Install dependencies**

Run (in the worktree `/Users/miguel/Desktop/programacion/repo-agent-feature`):

```bash
npm install @langchain/langgraph @google/genai dotenv
npm install --save-dev tsx @types/node
```

Expected: install completes; `package.json` gains `"@langchain/langgraph"`, `"@google/genai"`, `"dotenv"` under dependencies and `"tsx"`, `"@types/node"` under devDependencies.

- [ ] **Step 2: Add the `arch-team` script to `package.json`**

In the `"scripts"` block replace:

```json
    "build": "tsc --noEmit"
```

with:

```json
    "build": "tsc --noEmit",
    "arch-team": "tsx scripts/architecture-team/index.ts"
```

- [ ] **Step 3: Extend `jest.config.js` transformIgnorePatterns**

Replace line 5-7 in `jest.config.js`:

```js
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
```

with:

```js
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@langchain|@google)',
  ],
```

- [ ] **Step 4: Verify toolchain still green**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0 (no source references the new package yet, so no TS errors).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json jest.config.js
git commit -m "chore: add langgraph, genai deps and arch-team script"
```

---

### Task 2: Shared types + deterministic gatekeeper (TDD)

**Files:**
- Create: `scripts/architecture-team/types.ts`
- Create: `scripts/architecture-team/gatekeeper.ts`
- Create: `scripts/architecture-team/__tests__/gatekeeper.test.ts`

- [ ] **Step 1: Write the failing gatekeeper test**

Create `scripts/architecture-team/__tests__/gatekeeper.test.ts`:

```ts
import { evaluateGatekeeper, routeAfterGatekeeper } from '../gatekeeper';
import type { ArchitectureState } from '../types';

const base: ArchitectureState = {
  intent: 'auth pipeline',
  topologyNotes: 'expo-router: app/_layout.tsx guards',
  systemsApproved: true,
  specDraft: '# Spec draft',
  securityFindings: 'secure-store used for JWT',
  securityApproved: true,
  qaPlan: 'RNTL suites',
  gatekeeperStatus: 'PENDING',
  iteration: 0,
  feedback: [],
  specPath: '',
  adrPath: '',
  visited: [],
};

describe('evaluateGatekeeper', () => {
  it('approves when every DoD slice is non-empty', () => {
    const verdict = evaluateGatekeeper(base);
    expect(verdict.status).toBe('APPROVED');
    expect(verdict.iteration).toBe(1);
  });

  it('demands revision when specDraft is blank', () => {
    const verdict = evaluateGatekeeper({ ...base, specDraft: '   ' });
    expect(verdict.status).toBe('REVISION_NEEDED');
    expect(verdict.feedback).toContain('specDraft empty');
  });

  it('demands revision when qaPlan is blank', () => {
    const verdict = evaluateGatekeeper({ ...base, qaPlan: '' });
    expect(verdict.status).toBe('REVISION_NEEDED');
    expect(verdict.feedback).toContain('qaPlan empty');
  });
});

describe('routeAfterGatekeeper', () => {
  it('routes approve when status is APPROVED', () => {
    expect(routeAfterGatekeeper({ ...base, gatekeeperStatus: 'APPROVED' })).toBe('approve');
  });

  it('routes revision on first REVISION_NEEDED', () => {
    expect(routeAfterGatekeeper({ ...base, gatekeeperStatus: 'REVISION_NEEDED', iteration: 1 })).toBe('revision');
  });

  it('routes escalate once iteration reaches 2', () => {
    expect(routeAfterGatekeeper({ ...base, gatekeeperStatus: 'REVISION_NEEDED', iteration: 2 })).toBe('escalate');
  });
});
```

- [ ] **Step 2: Run the test to confirm failure**

Run: `npm test -- scripts/architecture-team/__tests__/gatekeeper.test.ts`
Expected: FAIL — `Cannot find module '../gatekeeper'`.

- [ ] **Step 3: Create `types.ts`**

```ts
export interface RoleProvider {
  generate(role: Role, intent: string, prior: string): Promise<string>;
}

export type Role = 'lead' | 'systems' | 'spec' | 'security' | 'qa';

export type GatekeeperStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REVISION_NEEDED'
  | 'ESCALATED';

export interface ArchitectureState {
  intent: string;
  topologyNotes: string;
  systemsApproved: boolean;
  specDraft: string;
  securityFindings: string;
  securityApproved: boolean;
  qaPlan: string;
  gatekeeperStatus: GatekeeperStatus;
  iteration: number;
  feedback: string[];
  specPath: string;
  adrPath: string;
  visited: string[];
}
```

- [ ] **Step 4: Create `gatekeeper.ts`**

```ts
import type { ArchitectureState, GatekeeperStatus } from './types';

export interface GatekeeperVerdict {
  status: 'APPROVED' | 'REVISION_NEEDED';
  iteration: number;
  feedback: string[];
}

export function evaluateGatekeeper(state: ArchitectureState): GatekeeperVerdict {
  const problems: string[] = [];
  if (!state.topologyNotes.trim()) problems.push('topologyNotes empty');
  if (!state.specDraft.trim()) problems.push('specDraft empty');
  if (!state.securityFindings.trim()) problems.push('securityFindings empty');
  if (!state.qaPlan.trim()) problems.push('qaPlan empty');
  return {
    status: problems.length === 0 ? 'APPROVED' : 'REVISION_NEEDED',
    iteration: state.iteration + 1,
    feedback: problems,
  };
}

export type GatekeeperRoute = 'approve' | 'revision' | 'escalate';

export function routeAfterGatekeeper(state: ArchitectureState): GatekeeperRoute {
  if (state.gatekeeperStatus === 'REVISION_NEEDED') {
    return state.iteration >= 2 ? 'escalate' : 'revision';
  }
  return 'approve';
}
```

Note: `GatekeeperStatus` is imported only for type-position use; it is referenced in `types.ts` and used by `index.ts` later. If ESLint flags it as unused here, drop that import — but keep it if the linter accepts type-only unused imports. `evaluateGatekeeper` returns `status` as a subtype of `GatekeeperStatus`.

- [ ] **Step 5: Run the test to confirm pass**

Run: `npm test -- scripts/architecture-team/__tests__/gatekeeper.test.ts`
Expected: PASS, 6/6 tests green.

- [ ] **Step 6: Commit**

```bash
git add scripts/architecture-team/types.ts scripts/architecture-team/gatekeeper.ts scripts/architecture-team/__tests__/gatekeeper.test.ts
git commit -m "feat: add architecture team types and deterministic gatekeeper with tests"
```

---

### Task 3: Artifact path resolution & file writer (TDD)

**Files:**
- Create: `scripts/architecture-team/artifacts.ts`
- Create: `scripts/architecture-team/__tests__/artifacts.test.ts`

- [ ] **Step 1: Write the failing artifacts test**

Create `scripts/architecture-team/__tests__/artifacts.test.ts`:

```ts
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
    fs.adrPathDummy = undefined as never;
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
```

Note: the `fs.adrPathDummy = undefined` line is a harmless artifact-free assignment to exercise the empty-ADR-dir branch; remove it if it trips a linter, and instead assert `adrPath` stays `0001` (no ADR files exist yet in this temp project). The spec-side assertion (`003`) is the real regression guard.

- [ ] **Step 2: Run the test to confirm failure**

Run: `npm test -- scripts/architecture-team/__tests__/artifacts.test.ts`
Expected: FAIL — `Cannot find module '../artifacts'`.

- [ ] **Step 3: Create `artifacts.ts`**

```ts
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
  width: number,
  pattern: RegExp,
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
  baseDir: string,
): ArtifactPaths {
  const title = sanitizeIntent(intent);
  const specSeq = nextSequence(
    path.join(baseDir, 'specs'),
    3,
    /^(\d{3})-.*\.md$/,
  );
  const adrSeq = nextSequence(
    path.join(baseDir, 'docs', 'adr'),
    4,
    /^(\d{4})-.*\.md$/,
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

export function writeArtifacts(state: ArchitectureState, baseDir: string): void {
  const specsDir = path.join(baseDir, 'specs');
  const adrDir = path.join(baseDir, 'docs', 'adr');
  fs.mkdirSync(specsDir, { recursive: true });
  fs.mkdirSync(adrDir, { recursive: true });
  fs.writeFileSync(path.join(baseDir, state.specPath), renderSpecFile(state));
  fs.writeFileSync(path.join(baseDir, state.adrPath), renderAdrFile(state));
}
```

- [ ] **Step 4: Run the test to confirm pass**

Run: `npm test -- scripts/architecture-team/__tests__/artifacts.test.ts`
Expected: PASS. The `fs.adrPathDummy` assignment is harmless in TS/JS (arbitrary property set on the module object); if a strict tsc config flags it, delete that line and rely on the empty-ADR-dir state — `resolveArtifactPaths` must still return `docs/adr/0001-new.md`.

- [ ] **Step 5: Commit**

```bash
git add scripts/architecture-team/artifacts.ts scripts/architecture-team/__tests__/artifacts.test.ts
git commit -m "feat: add sanitized artifact path resolution and writer with tests"
```

---

### Task 4: Gemini role provider with offline fallback (TDD)

**Files:**
- Create: `scripts/architecture-team/llm.ts`
- Create: `scripts/architecture-team/__tests__/llm.test.ts`

- [ ] **Step 1: Write the failing llm test**

Create `scripts/architecture-team/__tests__/llm.test.ts`:

```ts
import { GoogleGenAI } from '@google/genai';
jest.mock('@google/genai');

import { fallbackText, GeminiRoleProvider } from '../llm';

function mockGemini(): {
  generateContent: jest.Mock;
} {
  const ctor = GoogleGenAI as unknown as jest.Mock;
  ctor.mockClear();
  const provider = new GeminiRoleProvider('test-key');
  return { generateContent: ctor.mock.results[0].value.models.generateContent };
}

describe('fallbackText', () => {
  it('returns non-empty deterministic content per role', () => {
    for (const role of ['lead', 'systems', 'spec', 'security', 'qa']) {
      const text = fallbackText(role as Parameters<typeof fallbackText>[0], 'auth');
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

describe('GeminiRoleProvider', () => {
  it('returns model text trimmed', async () => {
    const { generateContent } = mockGemini();
    generateContent.mockResolvedValue({ text: '  RESULT  ' });
    const provider = new GeminiRoleProvider('test-key');
    await expect(provider.generate('spec', 'auth', '')).resolves.toBe('RESULT');
  });

  it('falls back when the model returns empty text', async () => {
    const { generateContent } = mockGemini();
    generateContent.mockResolvedValue({ text: '   ' });
    const provider = new GeminiRoleProvider('test-key');
    const text = await provider.generate('qa', 'auth', '');
    expect(text).toBe(fallbackText('qa', 'auth'));
  });

  it('falls back when the model call rejects', async () => {
    const { generateContent } = mockGemini();
    generateContent.mockRejectedValue(new Error('boom'));
    const provider = new GeminiRoleProvider('test-key');
    const text = await provider.generate('lead', 'auth', '');
    expect(text).toBe(fallbackText('lead', 'auth'));
  });
});
```

- [ ] **Step 2: Run the test to confirm failure**

Run: `npm test -- scripts/architecture-team/__tests__/llm.test.ts`
Expected: FAIL — `Cannot find module '../llm'`.

- [ ] **Step 3: Create `llm.ts`**

```ts
import { GoogleGenAI } from '@google/genai';
import type { Role, RoleProvider } from './types';

export const ROLE_SYSTEM_PROMPTS: Record<Role, string> = {
  lead: 'You are the Lead Mobile Architect. Scope the request, define platform '
    + 'boundaries (iOS/Android), and return compact markdown notes.',
  systems: 'You are the Systems & Modularity Architect. Enforce the Ponytail '
    + 'YAGNI ladder and Expo Router boundaries. Return markdown topology notes.',
  spec: 'You are the Spec & API Architect. Write a formal RFC draft with '
    + 'goals, non-goals, contracts, and test plan. Return markdown.',
  security: 'You are the Mobile Security Architect. Run STRIDE / OWASP Mobile '
    + 'checks: secure-store, deep links, client secrets. Return markdown findings.',
  qa: 'You are the Mobile QA Architect. Define RNTL-based TDD assertions and '
    + 'edge-case matrix. Return markdown.',
};

function buildPrompt(role: Role, intent: string, prior: string): string {
  return [
    `Squad intent: "${intent}".`,
    `Your role: ${role}.`,
    `Prior context:\n${prior || '(none)'}`,
    'Produce focused markdown for your responsibility only.',
  ].join('\n');
}

export function fallbackText(role: Role, intent: string): string {
  switch (role) {
    case 'spec':
      return `# Specification for: ${intent}\n- Status: Draft\n- Interfaces: Explicit`;
    case 'qa':
      return `## QA plan for: ${intent}\n- RNTL component tests\n- Edge-case matrix`;
    case 'security':
      return `## Security findings for: ${intent}\n- JWT -> expo-secure-store\n- No client secrets`;
    case 'systems':
      return `## Topology notes for: ${intent}\n- Expo Router in app/, logic in src/`;
    default:
      return `## Scope for: ${intent}\n- Mobile boundary: iOS + Android`;
  }
}

export class GeminiRoleProvider implements RoleProvider {
  private ai: GoogleGenAI | null;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.GEMINI_API_KEY;
    this.ai =
      key && key !== 'your_gemini_api_key_here'
        ? new GoogleGenAI({ apiKey: key })
        : null;
  }

  async generate(role: Role, intent: string, prior: string): Promise<string> {
    if (!this.ai) return fallbackText(role, intent);
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: buildPrompt(role, intent, prior),
        config: { systemInstruction: ROLE_SYSTEM_PROMPTS[role] },
      });
      const text = response.text?.trim() ?? '';
      return text || fallbackText(role, intent);
    } catch (error) {
      console.warn(`[arch-team] Gemini call failed for role=${role}:`, error);
      return fallbackText(role, intent);
    }
  }
}
```

- [ ] **Step 4: Run the test to confirm pass**

Run: `npm test -- scripts/architecture-team/__tests__/llm.test.ts`
Expected: PASS, 4/4 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/architecture-team/llm.ts scripts/architecture-team/__tests__/llm.test.ts
git commit -m "feat: add gemini role provider with offline fallback and tests"
```

---

### Task 5: Role node factory

**Files:**
- Create: `scripts/architecture-team/agents.ts`

- [ ] **Step 1: Create `agents.ts`**

```ts
import type { ArchitectureState, Role, RoleProvider } from './types';

type NodeFn = (state: ArchitectureState) => Promise<Partial<ArchitectureState>>;

export interface RoleNodes {
  lead: NodeFn;
  systems: NodeFn;
  spec: NodeFn;
  security: NodeFn;
  qa: NodeFn;
}

export function createNodes(provider: RoleProvider): RoleNodes {
  return {
    lead: async (state) => ({
      topologyNotes: await provider.generate('lead', state.intent, ''),
    }),
    systems: async (state) => ({
      topologyNotes: await provider.generate('systems', state.intent, state.topologyNotes),
      systemsApproved: true,
    }),
    spec: async (state) => ({
      specDraft: await provider.generate('spec', state.intent, state.topologyNotes),
    }),
    security: async (state) => {
      const findings = await provider.generate('security', state.intent, state.specDraft);
      return { securityFindings: findings, securityApproved: findings.trim().length > 0 };
    },
    qa: async (state) => ({
      qaPlan: await provider.generate('qa', state.intent, state.specDraft),
    }),
  };
}
```

Note: `Role` is imported for documentation symmetry; if ESLint flags the unused import, remove `Role` from the import on line 1 and keep only `ArchitectureState, RoleProvider`. `NodeFn` is intentionally local (`Private helpers should not be exported` per rule 02).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0 with no errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/architecture-team/agents.ts
git commit -m "feat: add role node factory wired to role provider"
```

---

### Task 6: StateGraph, pipeline runner, CLI, remove Python demo (TDD + E2E)

**Files:**
- Create: `scripts/architecture-team/index.ts`
- Create: `scripts/architecture-team/__tests__/workflow.test.ts`
- Delete: `scripts/architecture-team/run.py`

- [ ] **Step 1: Write the failing workflow test**

Create `scripts/architecture-team/__tests__/workflow.test.ts`:

```ts
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
      'lead', 'systems', 'spec', 'security', 'qa', 'gatekeeper', 'writeArtifacts',
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
```

- [ ] **Step 2: Run the test to confirm failure**

Run: `npm test -- scripts/architecture-team/__tests__/workflow.test.ts`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 3: Create `index.ts`**

```ts
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { writeArtifacts, resolveArtifactPaths } from './artifacts';
import { createNodes } from './agents';
import { evaluateGatekeeper, routeAfterGatekeeper } from './gatekeeper';
import { sanitizeIntent } from './artifacts';
import { GeminiRoleProvider } from './llm';
import type {
  ArchitectureState,
  GatekeeperStatus,
  RoleProvider,
} from './types';

const StateAnnotation = Annotation.Root({
  intent: Annotation<string>,
  topologyNotes: Annotation<string>,
  systemsApproved: Annotation<boolean>,
  specDraft: Annotation<string>,
  securityFindings: Annotation<string>,
  securityApproved: Annotation<boolean>,
  qaPlan: Annotation<string>,
  gatekeeperStatus: Annotation<GatekeeperStatus>,
  iteration: Annotation<number>,
  feedback: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
  specPath: Annotation<string>,
  adrPath: Annotation<string>,
  visited: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
});

export interface GraphDeps {
  provider?: RoleProvider;
  baseDir?: string;
}

export function compileGraph(deps: GraphDeps = {}) {
  const provider = deps.provider ?? new GeminiRoleProvider();
  const baseDir = deps.baseDir ?? process.cwd();
  const nodes = createNodes(provider);

  const writeArtifactsNode = async (state: ArchitectureState) => {
    const paths = resolveArtifactPaths(state.intent, baseDir);
    writeArtifacts({ ...state, ...paths }, baseDir);
    return {
      ...paths,
      gatekeeperStatus: 'APPROVED' as GatekeeperStatus,
      visited: ['writeArtifacts'],
    };
  };

  const escalateNode = async () => ({
    gatekeeperStatus: 'ESCALATED' as GatekeeperStatus,
    visited: ['escalate'],
  });

  const gatekeeperNode = async (state: ArchitectureState) => {
    const verdict = evaluateGatekeeper(state);
    return {
      gatekeeperStatus: verdict.status,
      iteration: verdict.iteration,
      feedback: verdict.feedback,
      visited: ['gatekeeper'],
    };
  };

  return new StateGraph(StateAnnotation)
    .addNode('lead', async (s) => ({ ...(await nodes.lead(s)), visited: ['lead'] }))
    .addNode('systems', async (s) => ({ ...(await nodes.systems(s)), visited: ['systems'] }))
    .addNode('spec', async (s) => ({ ...(await nodes.spec(s)), visited: ['spec'] }))
    .addNode('security', async (s) => ({ ...(await nodes.security(s)), visited: ['security'] }))
    .addNode('qa', async (s) => ({ ...(await nodes.qa(s)), visited: ['qa'] }))
    .addNode('gatekeeper', gatekeeperNode)
    .addNode('writeArtifacts', writeArtifactsNode)
    .addNode('escalate', escalateNode)
    .addEdge(START, 'lead')
    .addEdge('lead', 'systems')
    .addEdge('systems', 'spec')
    .addEdge('spec', 'security')
    .addEdge('security', 'qa')
    .addEdge('qa', 'gatekeeper')
    .addConditionalEdges('gatekeeper', routeAfterGatekeeper, {
      approve: 'writeArtifacts',
      revision: 'spec',
      escalate: 'escalate',
    })
    .addEdge('writeArtifacts', END)
    .addEdge('escalate', END)
    .compile();
}

export async function runArchitecturePipeline(
  intent: string,
  deps?: GraphDeps,
): Promise<ArchitectureState> {
  const graph = compileGraph(deps);
  return graph.invoke({
    intent,
    gatekeeperStatus: 'PENDING',
    iteration: 0,
    systemsApproved: false,
    securityApproved: false,
    specPath: '',
    adrPath: '',
  });
}

async function main(): Promise<void> {
  const intent = process.argv[2] ?? '';
  if (!sanitizeIntent(intent)) {
    console.error('Usage: npm run arch-team -- "<mobile-feature-or-system-goal>"');
    process.exit(1);
  }
  try {
    const state = await runArchitecturePipeline(intent);
    console.log(`\n🧩 Architecture Team trace: ${state.visited.join(' → ')}`);
    console.log(`Status: ${state.gatekeeperStatus}`);
    if (state.specPath) console.log(`Spec:  ${state.specPath}`);
    if (state.adrPath) console.log(`ADR:   ${state.adrPath}`);
    if (state.feedback.length) console.log(`Feedback: ${state.feedback.join('; ')}`);
    process.exit(state.gatekeeperStatus === 'ESCALATED' ? 2 : 0);
  } catch (error) {
    console.error('[arch-team] Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
```

Note: `require.main === module` is the tsx/CJS guard so that importing `index.ts` from tests does not trigger `main()`. If the tsx runtime resolves `require.main` differently, replace the guard with a `process.argv[1] && process.argv[1].endsWith('index.ts')` check.

- [ ] **Step 4: Run the workflow test to confirm pass**

Run: `npm test -- scripts/architecture-team/__tests__/workflow.test.ts`
Expected: PASS, 2/2 tests.

- [ ] **Step 5: Delete the Python demo**

```bash
git rm scripts/architecture-team/run.py
```

- [ ] **Step 6: Exercise the CLI end-to-end (offline fallback)**

Run: `npm run arch-team -- "offline demo intent"`
Expected: prints the node trace ending in `writeArtifacts`, `Status: APPROVED`, and writes `specs/001-offline-demo-intent.md` + `docs/adr/0001-offline-demo-intent.md` (or the next free sequence numbers).

Clean up those two generated files (they are byproducts of a smoke test, not artifacts for this feature):

```bash
git status --porcelain scripts/architecture-team specs docs/adr
```

- [ ] **Step 7: Commit**

```bash
git add scripts/architecture-team/index.ts scripts/architecture-team/__tests__/workflow.test.ts
git add -u scripts/architecture-team
git commit -m "feat: implement langgraph architecture team workflow, CLI, and remove python demo"
```

If `git add -u scripts/architecture-team` also staged smoke-test artifacts, unstage and delete them first:

```bash
git rm specs/001-offline-demo-intent.md docs/adr/0001-offline-demo-intent.md
```

---

### Task 7: Full verification gate + session handoff

**Files:**
- Modify: `.agents/state/session-log.md`
- Modify: `.agents/state/current-milestone.md`

- [ ] **Step 1: Run the universal gate**

Run: `./scripts/verify.sh check-all`
Expected:
- LINT: ESLint exits 0.
- TEST: all Jest suites pass, including the 4 new architecture-team suites.
- BUILD: `tsc --noEmit` exits 0.
- SECRET SCAN: `scripts/pre-commit-hook.sh` clean.

If lint/typecheck flags a pattern (e.g. `require.main`, `console.warn`, the `Role` unused import, or `fs.adrPathDummy` in tests), fix the flagged code — never weaken test assertions.

- [ ] **Step 2: Record the session ledger**

Append to `.agents/state/session-log.md`:

```markdown
---

### [2026-09-15] Session: LangGraph Architecture Team Orchestrator
- **Status**: Completed
- **Changes Made**:
  - Replaced `scripts/architecture-team/run.py` with a TypeScript LangGraph
    StateGraph (`scripts/architecture-team/`) implementing the architecture-team
    skill end-to-end.
  - Added nodes lead/systems/spec/security/qa/gatekeeper/writeArtifacts/escalate
    with deterministic gatekeeper and max 1 revision loop.
  - Added `npm run arch-team` CLI, Gemini role provider with offline fallback,
    artifact writer for `specs/` + `docs/adr/`.
  - Added Jest suites: gatekeeper, artifacts, llm, workflow.
- **Verification**: `scripts/verify.sh check-all` passing (lint, Jest, tsc, secret scan).
- **Next Actions**: Human reviews generated artifacts; commit feature branch and
  open PR for human approval.
```

- [ ] **Step 3: Update the milestone file**

Replace the body of `.agents/state/current-milestone.md` with:

```markdown
## Active Milestone: LangGraph Architecture Team Orchestrator
- **Goal**: Executable multi-agent architecture squad in TypeScript.
- **Phase**: Implementation complete; pending human review + PR.
- **Artifacts**: `scripts/architecture-team/`, spec in `specs/003-langgraph-architecture-team.md`,
  ADR in `docs/adr/0002-langgraph-architecture-team.md`.
```

- [ ] **Step 4: Final clean-tree check and commit**

Run: `git status --porcelain`
Expected: only the two state files modified.

```bash
git add .agents/state/session-log.md .agents/state/current-milestone.md
git commit -m "docs: record langgraph architecture team session handoff"
```

---

## Self-Review

**Spec coverage:**
- Replace `run.py` with TS StateGraph → Task 1, 6.
- Nodes lead/systems/spec/security/qa/gatekeeper/writeArtifacts → Task 5, 6.
- Gemini per role + deterministic fallback → Task 4.
- Deterministic gatekeeper validating DoD → Task 2.
- Bounded revision loop (max 1) → Task 2 (`routeAfterGatekeeper`), Task 6 (conditional edge).
- Write `specs/` + `docs/adr/` on approval → Task 3, 6.
- CLI `npm run arch-team` → Task 1, 6.
- Jest coverage: gatekeeper/artifacts/llm/workflow → Tasks 2, 3, 4, 6.
- `scripts/verify.sh check-all` gate → Task 7.
- Session handoff ledger → Task 7.

**Placeholder scan:** all code blocks are literal implementations; no TBD/TODO.