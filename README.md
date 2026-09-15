# Language-Agnostic AI Project Template

An enterprise-grade, language-agnostic foundation for building software with AI coding agents (Google Antigravity, Claude Code, Cursor, Codex, and OpenCode).

---

## 🌟 Key Highlights

- **The Unified Agentic Architecture Suite**: A single, consolidated pack of **8 non-overlapping lifecycle skills** fusing Addy Osmani's `agent-skills`, Superpowers, Ponytail, Graphify, and the LangChain Architecture Team.
- **Polyglot Agnosticism**: Out-of-the-box auto-detection for **Python, TypeScript/JavaScript, Go, Rust, Java**, and C++.
- **Universal 4-Target Toolchain (`scripts/verify.sh`)**: Standardized commands (`test`, `lint`, `build`, `check-all`) preventing AI agents from guessing runners.
- **Human-in-the-Loop Release Authority**: AI builds locally; releases, pushes, and production merges remain strictly under human command.
- **Persistent Architectural Memory**: Ingests and queries codebase topology with Graphify (`.graphify/`) and records decisions in `docs/adr/`.
- **Anti-Hallucination & Anti-Tampering**: Strict rules preventing agents from weakening test assertions or faking green builds.
- **Pre-Commit Secret Quarantine**: Automated scanner preventing API keys and untracked scratchpads from being committed.

---

## 📂 Architecture & Directory Structure

```text
├── AGENTS.md                          # Lean Master Agent index (<100 lines) & Golden Rules
├── toolchain.env                      # Universal language runner overrides
├── .agents/
│   ├── state/                         # Session handoff ledger & active milestone
│   ├── rules/                         # Active workspace rules (Git safety, modularity, DoD)
│   ├── skills/                        # The Unified Single Pack (8 lifecycle skills)
│   │   ├── architecture-team/         # LangChain multi-agent StateGraph orchestrator
│   │   ├── codebase-graph/            # Graphify AST & Knowledge Graph engine
│   │   ├── spec-driven-design/        # Unified RFC & interface specification
│   │   ├── security-hardening/        # OWASP & STRIDE threat modeling
│   │   ├── minimal-implementation/    # TDD + Ponytail 7-rung minimalist ladder
│   │   ├── systematic-debugging/      # Root-cause hypothesis & reproduction protocol
│   │   ├── code-review/               # Two-stage: Ponytail shrink + Staff 5-axis review
│   │   └── verify-and-ship/           # Definition of Done, Prove-It evidence & toolchain runner
│   └── references/                    # Shared checklists (DoD, Security, Testing, Orchestration)
├── specs/                             # Specification-driven development (RFCs & contracts)
│   └── 000-spec-template.md
├── docs/
│   ├── adr/                           # Architecture Decision Records
│   └── architecture/                  # System design guides
├── scripts/
│   ├── init-project.sh                # 10-second bootstrapper for any language
│   ├── verify.sh                      # Universal 4-target test/lint/build runner
│   ├── pre-commit-hook.sh             # Secret scanner & untracked scratch check
│   └── architecture-team/run.py       # LangChain squad runner
└── .github/
    └── PULL_REQUEST_TEMPLATE.md       # PR template with AI verification checklist
```

---

## 🚀 Quick Start: Bootstrapping a Project

Clone this template and bootstrap your project in 10 seconds:

```bash
# For Python
./scripts/init-project.sh --name "my-service" --stack python

# For TypeScript / Node
./scripts/init-project.sh --name "my-api" --stack ts

# For Go
./scripts/init-project.sh --name "my-microservice" --stack go

# For Rust
./scripts/init-project.sh --name "my-engine" --stack rust
```

### Running Verification
Verify your project anytime using the universal 4-target runner:
```bash
./scripts/verify.sh test       # Run tests
./scripts/verify.sh lint       # Run linters
./scripts/verify.sh build      # Run build
./scripts/verify.sh check-all  # Run full quality gate + secret scan
```

---

## 🧭 Working with AI Agents

When interacting with an AI agent in this repository, you can leverage slash triggers or prompt instructions:

| Workflow | Command / Trigger | What the Agent Does |
| :--- | :--- | :--- |
| **Explore & Map** | `/graphify` | Ingests AST topology, builds knowledge graph in `.graphify/`, and detects god nodes. |
| **Design Architecture** | `/arch-team [goal]` | Coordinates the LangChain squad (Lead, Spec, Systems, Security, QA, Gatekeeper). |
| **Draft Specification** | `/spec [feature]` | Generates structured RFC in `specs/` with user stories and test criteria. |
| **Security Audit** | `/security` | Audits trust boundaries, OWASP Top 10 vulnerabilities, and secrets. |
| **Implement (TDD)** | `implement [feature]` | Writes failing test first, then minimal code via the Ponytail 7-rung ladder. |
| **Debug Root Cause** | `debug [error]` | Formulates hypothesis $\rightarrow$ minimal repro test $\rightarrow$ root cause fix. |
| **Code Review** | `/review` | Stage 1 (Ponytail shrink lines) $\rightarrow$ Stage 2 (Staff 5-axis review). |
| **Verify & Handoff** | `/verify` | Runs `verify.sh check-all`, verifies DoD, and logs session in `.agents/state/`. |

---

## 📄 License
MIT
# hubik-mobile
