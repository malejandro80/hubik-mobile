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
    expect(
      routeAfterGatekeeper({
        ...base,
        gatekeeperStatus: 'REVISION_NEEDED',
        iteration: 1,
      })
    ).toBe('revision');
  });

  it('routes escalate once iteration reaches 2', () => {
    expect(
      routeAfterGatekeeper({
        ...base,
        gatekeeperStatus: 'REVISION_NEEDED',
        iteration: 2,
      })
    ).toBe('escalate');
  });
});
