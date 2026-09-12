## Description
<!-- Brief summary of what this change accomplishes -->

## RFC / Spec Link
- Related Spec: `specs/` (Link to spec file if applicable)
- Related ADR: `docs/adr/` (Link to ADR file if applicable)

## Definition of Done (DoD) Verification
Please verify each item before requesting human review:
- [ ] **Tests Passing**: Output of `scripts/verify.sh test` exits with code 0.
- [ ] **Linters Clean**: Output of `scripts/verify.sh lint` exits with zero errors.
- [ ] **Ponytail Check**: Zero unrequested abstractions; YAGNI ladder respected; net lines minimized.
- [ ] **Security Check**: Untrusted inputs validated at boundaries; zero secrets in code or logs.
- [ ] **Anti-Tampering Verified**: No existing test assertions were weakened or removed.
- [ ] **Session Handoff Updated**: Session details logged in `.agents/state/session-log.md`.

## Test Evidence
<!-- Paste raw stdout output from `scripts/verify.sh test` or terminal execution -->
```
[paste output here]
```
