---
name: spec-driven-design
description: >-
  Formulates formal technical specifications and RFCs in specs/ before coding. Establishes user stories,
  API contracts, error states, and testable acceptance criteria. Use when designing features or running /spec.
argument-hint: "[feature-name]"
---

# Spec-Driven Design: Formal Contracts & RFCs

This skill enforces specification-driven development, ensuring all requirements, edge cases, public interfaces, and acceptance criteria are agreed upon before writing any application code.

## When to Use
- Before starting any non-trivial feature or architectural refactor.
- When ambiguity exists about public API contracts or data models.
- When invoking `/spec <feature-name>`.

---

## The Specification Process

1. **Copy the Template**:
   - Create a new document: `specs/<XXX>-<feature-name>.md` using `specs/000-spec-template.md`.
2. **Define Boundaries & User Stories**:
   - Write clear user stories with Given / When / Then criteria.
   - List explicit **Non-Goals** (what this feature will NOT do).
3. **Design Contracts (Hyrum's Law Safe)**:
   - Define exact request/response schemas, error status codes, and type signatures.
   - Ensure private implementation details are not exposed in the API contract.
4. **Identify Edge Cases & Failure Modes**:
   - Network timeouts, invalid inputs, rate limits, concurrent modifications, and empty states.
5. **Establish Verification Checklist**:
   - Define the exact automated tests required for the Definition of Done.

---

## Anti-Rationalization Table

| Common Agent Excuse | Why It Fails | Mandatory Response |
| :--- | :--- | :--- |
| *"I'll write the code first to explore, then write the spec."* | Code written without a spec drifts into accidental complexity and uncontrolled scope. | Draft the specification contract first. Stop and obtain human approval before implementing. |
| *"This is just an internal utility, it doesn't need an RFC."* | Internal utilities without contracts frequently break caller assumptions. | If it has more than one consumer or modifies data structures, draft a lightweight spec. |
| *"We don't need to specify error cases now."* | Unspecified error paths become production outages and unhandled crashes. | Specify every expected error condition and its exact return type. |

---

## Verification Criteria
- [ ] Document committed at `specs/<XXX>-<feature-name>.md`.
- [ ] Includes Goals, Non-Goals, Interfaces, Edge Cases, and Test Plan.
- [ ] Approved by the developer/human lead before implementation begins.
