# Architecture Overview: Language-Agnostic AI Project Template

## 1. Architectural Philosophy

This repository is engineered to maximize development velocity while enforcing enterprise software engineering discipline when pairing with AI coding agents.

### Core Tenets
1. **The Codebase is an Organism**: Code, specifications, tests, and architectural memory are tightly coupled.
2. **Minimalist by Default (Ponytail Ladder)**: The cleanest code is the code you never write. Never introduce abstractions before they are required.
3. **Verified Evidence (Prove-It Pattern)**: Speculative claims are rejected. Every capability requires verifiable execution evidence.
4. **Polyglot Agnosticism**: Standardized interfaces allow this template to host Python, TypeScript, Go, Rust, Java, or C++ with identical agent behaviors.

---

## 2. Directory Layout & Layer Responsibilities

```text
├── AGENTS.md                  # Master dispatch index (<100 lines)
├── toolchain.env              # Declarative runner overrides
├── .agents/
│   ├── rules/                 # Auto-discovered operational rules
│   ├── skills/                # 8 unified lifecycle skills
│   ├── references/            # Shared checklists (DoD, Security, Testing)
│   └── state/                 # Session continuity ledger & active milestone
├── specs/                     # Formal feature specifications and contracts
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   └── architecture/          # High-level system design guides
└── scripts/                   # Universal toolchain, bootstrapper & pre-commit hooks
```

---

## 3. Human-in-the-Loop Release Flow
Local development is collaborative between developer and AI agents. Release authority, production deployments, and `git push` remain strictly under the human lead's command.
