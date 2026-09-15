# ADR 0002: LangGraph Multi-Agent Architecture Team Orchestrator

- **Status**: Accepted
- **Deciders**: Human Lead, Lead Mobile Architect, AI Agent
- **Date**: 2026-09-15
- **Technical Story / RFC**: [RFC 003 — LangGraph Multi-Agent Architecture Team Orchestrator](../specs/003-langgraph-architecture-team.md)

---

## Context and Problem Statement

The Architecture Team skill (`.agents/skills/architecture-team/SKILL.md`) specifies a LangChain-powered multi-agent squad that drafts specs, audits security, plans QA, and gates on Definition of Done before coding. The repository ships only a Python demo (`scripts/architecture-team/run.py`) that prints step names without executing a real StateGraph, invoking an LLM, or producing `specs/` and `docs/adr/` artifacts. The codebase is entirely JavaScript/TypeScript (Expo, Express, `@google/genai`), so the Python demo is shell-only documentation rather than usable tooling.

---

## Decision Drivers
1. **Language Unification**: Keep the agent orchestrator in the same TypeScript/Node toolchain as the rest of the repo (no Python runtime added).
2. **Standard Library & Installed Dependencies First**: Reuse the existing `@google/genai` Gemini integration and `dotenv`; add a single orchestration dependency (`@langchain/langgraph`).
3. **Bounded Control Flow**: Enforce the orchestration reference (`.agents/references/orchestration-patterns.md`): max 1 revision loop, deterministic gatekeeper, escalation to human.
4. **Testability**: Deterministic fallback path + Jest so the whole graph runs offline and in CI without API keys.

---

## Considered Options
1. **TypeScript LangGraph (`@langchain/langgraph`)** — native stack fit, jest-testable, single new dependency, reuses `@google/genai`.
2. **Python LangGraph (`langgraph`)** — the most mature SDK, but requires bootstrapping a Python toolchain (requirements.txt, venv) inside a pure Node repo and duplicating the Gemini client.
3. **HTTP/Express orchestration layer** — exposes the squad as a server; adds a network surface and deployment burden with no benefit for an internal governance tool.

---

## Decision Outcome
Chosen option: **[TypeScript LangGraph (`@langchain/langgraph`) in `scripts/architecture-team/`]**, because it runs within the existing Node/TypeScript toolchain, is testable with the already-configured Jest stack, reuses `@google/genai` for role LLM calls, and implements the exact bounded-loop orchestration required by the governance rules.

### Positive Consequences
- One language across the entire repository; no new runtime or CI tooling.
- The orchestrator is truly executable and CI-verifiable (`scripts/verify.sh check-all`).
- Deterministic fallback makes the graph runnable offline and in test environments without secrets.
- Artifacts (`specs/`, `docs/adr/`) are generated automatically on approval, aligning tooling with the skill documentation.

### Negative Consequences / Trade-offs
- `@langchain/langgraph` is a new runtime dependency; its ESM/Node entrypoints must be covered by `transformIgnorePatterns` in Jest if a transform error surfaces.
- Gemini role quality varies with the prompt; mitigated by the deterministic gatekeeper that only approves structurally-complete artifacts.
- Human review remains mandatory: artifacts are written to disk but never committed or pushed by the graph.

---

## Compliance & Enforcement
- `scripts/architecture-team/__tests__/gatekeeper.test.ts`, `artifacts.test.ts`, `llm.test.ts`, and `workflow.test.ts` enforce topology, bounded iteration, artifact integrity, and fallback behavior.
- `scripts/verify.sh check-all` (lint + Jest + `tsc --noEmit` + secret scan) must pass.
- File length cap (<300 lines/module) from `.agents/rules/02-architecture-core.md` applies to every new module.