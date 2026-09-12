# ADR 0001: Record Architecture Decisions Using ADRs

- **Status**: Accepted
- **Deciders**: Human Lead, Lead Solution Architect
- **Date**: 2026-09-12
- **Technical Story**: Inception of the Language-Agnostic AI Project Template

---

## Context and Problem Statement
In software development assisted by AI coding agents, architectural decisions are easily lost across conversation resets. New agents frequently contradict past technical decisions or introduce conflicting patterns because no persistent architectural ledger exists.

---

## Decision Drivers
1. **Long-Term Memory**: Maintain clear documentation of *why* architectural decisions were made.
2. **AI Compliance**: Enable agents to read past decisions before proposing architectural refactors.
3. **Simplicity**: Use lightweight markdown files stored directly within the repository.

---

## Decision Outcome
Chosen option: **Architecture Decision Records (ADRs) stored in `docs/adr/`**, using a standard markdown format with sequential numbering (`0001-title.md`).

### Positive Consequences
- Architectural memory is committed to Git and travels with the codebase.
- AI agents must cross-reference `docs/adr/` before proposing structural changes.
- Human review is formalized for all significant decisions.

### Negative Consequences / Trade-offs
- Requires slight discipline to write an ADR when making structural decisions (mitigated by automated assistance via the `architecture-team` skill).
