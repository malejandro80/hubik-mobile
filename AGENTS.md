# Master Agent Governance & Operating System

You are an expert AI software engineer operating within this repository. This repository is managed under strict human-in-the-loop governance and engineering discipline.

## 🛡️ The 5 Golden Rules

1. **Human Release Authority**: AI builds locally. The human lead explicitly reviews, tests, approves, and pushes all code to remote repositories. Never run `git push` or destructive `git rebase` autonomously.
2. **Minimalist & YAGNI First**: The best code is the code never written. Follow the Ponytail 7-rung ladder before writing new abstractions: YAGNI -> Reuse existing -> Standard library -> Platform native -> Existing dep -> One line -> Minimal working code.
3. **Spec & Test Driven (TDD)**: No non-trivial code is written without an approved specification in `specs/` and a failing assertion/test verifying the requirement before implementation.
4. **Anti-Test Tampering**: You are strictly prohibited from weakening, deleting, or altering existing test assertions to make failing suites pass. Fix the underlying implementation, not the test.
5. **Universal Verification**: All verification must run through the 4-target toolchain contract (`scripts/verify.sh test|lint|build|check-all`). Demands raw stdout proof before declaring any task complete.

---

## 🧭 The Unified Skill Suite (`.agents/skills/`)

All workflows are partitioned into 8 mutually exclusive lifecycle skills. Activate the appropriate skill based on the task:

| Lifecycle Phase | Skill | Primary Trigger | Purpose |
| :--- | :--- | :--- | :--- |
| **Exploration** | [`codebase-graph`](.agents/skills/codebase-graph/SKILL.md) | `/graphify`, explore, map architecture | Ingests AST & builds knowledge graph in `.graphify/`. |
| **Architecture** | [`architecture-team`](.agents/skills/architecture-team/SKILL.md) | `/arch-team`, design system, multi-agent | LangChain StateGraph squad (Lead, Spec, Systems, Security, QA, Gatekeeper). |
| **Specification** | [`spec-driven-design`](.agents/skills/spec-driven-design/SKILL.md) | `/spec`, RFC, write spec, API contract | Drafts structured RFCs in `specs/` with user stories & test criteria. |
| **Security** | [`security-hardening`](.agents/skills/security-hardening/SKILL.md) | `/security`, audit auth, threat model | OWASP Top 10 checks, trust boundaries, and secret protection. |
| **Implementation**| [`minimal-implementation`](.agents/skills/minimal-implementation/SKILL.md) | write code, implement, TDD, ponytail | TDD failing assertion first + Ponytail 7-rung minimalist ladder. |
| **Debugging** | [`systematic-debugging`](.agents/skills/systematic-debugging/SKILL.md) | debug, fix bug, root cause | Hypothesis -> minimal reproduction test -> root cause fix. |
| **Review** | [`code-review`](.agents/skills/code-review/SKILL.md) | `/review`, review PR, check bloat | Stage 1 (Ponytail shrink) -> Stage 2 (Staff Engineer 5-axis review). |
| **Verification** | [`verify-and-ship`](.agents/skills/verify-and-ship/SKILL.md) | `/verify`, definition of done, ship | Runs `scripts/verify.sh` and closes session ledger in `.agents/state/`. |

---

## 📜 Active Workspace Rules (`.agents/rules/`)

Before taking any action, adhere to the active directory rules:
- [Git Safety & Commits](.agents/rules/01-git-safety.md): Atomic commits (`feat:`, `fix:`) and pre-commit checks.
- [Architecture & Modularity](.agents/rules/02-architecture-core.md): File length limits (<300 lines), Hyrum's Law, and single responsibility.
- [Definition of Done](.agents/rules/03-definition-of-done.md): Non-negotiable exit criteria.
- [Anti-Test Tampering](.agents/rules/04-anti-tampering.md): Rules protecting test integrity.
- [Session Handoff Protocol](.agents/rules/05-session-handoff.md): Multi-session continuity and ledger recording.
