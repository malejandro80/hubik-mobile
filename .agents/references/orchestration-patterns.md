# Reference: Multi-Agent Orchestration & Governance Patterns

This reference specifies how AI agents and personas collaborate without deadlocks, circular debates, or context overflow.

## 🧭 The Core Orchestration Principles

1. **Personas Do Not Invoke Personas**:
   - Only the Primary Agent or Lead Architect coordinates subagents. A reviewer persona must never independently spawn another subagent.
2. **Bounded Iteration Cycles (Max 1 Loop)**:
   - When a review persona (e.g., `code-reviewer` or `security-auditor`) requests revisions:
     - The coder agent receives the critique and has **exactly one chance** to fix the issue.
     - The reviewer checks the second revision.
     - If the issue persists, the debate is immediately halted and escalated to the **Human Lead** with a diff comparison.
3. **Structured Handoff Payloads**:
   - Subagents must exchange clean, structured outputs (JSON or compact markdown tables), never dumping verbose stream-of-consciousness thoughts into the shared context.
4. **Human in Escrow**:
   - The human lead is the ultimate arbiter for conflicting trade-offs (e.g., performance vs. simplicity).
