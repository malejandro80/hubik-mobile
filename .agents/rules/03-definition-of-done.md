# Workspace Rule: Definition of Done (DoD)

No task, feature, or bug fix is considered complete until it satisfies all criteria of the standing **Definition of Done**.

## 📋 Non-Negotiable Acceptance Checklist

1. **Specification Alignment**:
   - The implementation matches the accepted requirements and constraints documented in `specs/`.
2. **Automated Verification**:
   - All tests pass via `scripts/verify.sh test`.
   - The test suite includes unit or integration tests verifying the new behavior or bug fix.
   - Code passes static analysis and type checking via `scripts/verify.sh lint`.
3. **Complexity & YAGNI Check**:
   - The diff introduces no speculative abstractions or unrequested configuration options.
   - Standard library solutions are used in place of custom reinventions.
4. **Security & Boundary Check**:
   - User inputs are validated at system boundaries.
   - No sensitive credentials, tokens, or plain-text secrets exist in code or logs.
   - Passes `scripts/pre-commit-hook.sh` secret scan.
5. **Zero Waste & Clean Worktree**:
   - No temporary debug scripts, scratch test files, or commented-out dead code left in the working tree.
   - Git status is clean with atomic commits following the Conventional Commits format.
6. **Session Handoff Ledger**:
   - The completed increment and next steps are logged in `.agents/state/session-log.md`.
