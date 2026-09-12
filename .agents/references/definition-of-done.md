# Reference: Definition of Done (DoD)

This reference defines the project-wide standing quality bar that every code change must clear before being submitted for human approval.

## The Standing Bar

### 1. Functional Correctness
- [ ] Meets all explicit goals defined in the task or RFC.
- [ ] Handles identified edge cases and input boundaries.
- [ ] No regression introduced to existing capabilities.

### 2. Automated Quality Gates
- [ ] `scripts/verify.sh test` exits with code 0 (all tests passing).
- [ ] `scripts/verify.sh lint` exits with code 0 (zero lint errors or compiler warnings).
- [ ] If applicable, type checking passes with zero errors.

### 3. Engineering Judgment & Ponytail Ladder
- [ ] Built using the simplest solution that works (YAGNI enforced).
- [ ] Standard library or platform native capabilities used where available.
- [ ] No unrequested third-party dependencies added.
- [ ] Net lines of code minimized.

### 4. Security & Hardening
- [ ] User input sanitized and validated at trust boundaries.
- [ ] No plain-text secrets, tokens, or credentials in source code.
- [ ] Pre-commit hook passes with clean scan.

### 5. Repository Cleanliness
- [ ] No temporary test scripts, scratch directories, or debug `console.log`/`print` left behind.
- [ ] Clean git diff formatted in conventional commits (`feat:`, `fix:`, etc.).
- [ ] Session log updated in `.agents/state/session-log.md`.
