# RFC [XXX]: [Feature Title]

- **Author**: [AI Agent / Engineer Name]
- **Status**: Draft | Under Review | Approved | Superseded
- **Created**: [YYYY-MM-DD]
- **Target Release / Milestone**: [Milestone Name]

---

## 1. Problem Statement & Motivation
*Why are we building this? What user pain point or technical requirement does it solve?*

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] Goal 1: [Measurable, testable requirement]
- [ ] Goal 2: [Measurable, testable requirement]

### Non-Goals (Out of Scope)
- *Explicitly list what this feature will NOT do to prevent scope creep.*

---

## 3. User Stories & Acceptance Criteria
- **Story 1**:
  - **Given** [initial system state]
  - **When** [user or caller performs action]
  - **Then** [expected observable outcome]

---

## 4. Proposed Architecture & Public Contracts

### Interface Schemas & Signatures
```typescript
// Define explicit interfaces, types, or function signatures here
```

### Data Models & State Changes
*Describe any changes to database schemas, configuration files, or memory state.*

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
*How is external input validated?*

### Failure Modes & Status Codes
| Failure Condition | Handling Strategy | Return Code / Error Type |
| :--- | :--- | :--- |
| Network Timeout | Retry 3x with backoff | 504 Gateway Timeout |
| Invalid Payload | Reject at boundary | 400 Bad Request |

---

## 6. Verification & Test Plan
- [ ] Unit Test: [Specific isolated unit test case]
- [ ] Integration Test: [Component interaction test case]
- [ ] Performance / Security check: [Constraint verification]
