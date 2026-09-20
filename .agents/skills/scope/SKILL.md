---
name: scope
description: >-
  Limits a vague feature idea to a small, agreed slice of WHAT will be built by asking focused questions,
  grounded in existing behavior and shipped RFCs. Does not decide how it is built. Produces a scope brief
  that is the input to the architecture step. Use before /arch-team, when a feature request is broad or
  ambiguous, or when running /scope.
argument-hint: "[feature-idea]"
---

# Scope: Limit the Feature Through Questions

This skill turns "I want X" into a bounded, testable slice of X. It defines **what** the feature is and where it stops. **How** it is built (screens, components, data model, Edge Functions, contracts) belongs to the next step, `architecture-team`. The human decides every answer; the agent asks, proposes defaults, and records.

## When to Use
- A feature idea arrives without clear boundaries ("add favorites", "improve search").
- Before `architecture-team`, so the design starts from an agreed scope instead of assumptions.
- When invoking `/scope <feature-idea>`.

Skip it for bug fixes, or for changes already fully bounded in an existing `specs/` RFC.

## Lifecycle Position
`scope` (what, and its limits) -> `architecture-team` (how, RFC and ADR) -> `security-hardening` -> `minimal-implementation` -> `code-review` -> `verify-and-ship`.

---

## The Scoping Process

1. **Ground Before Asking**:
   - Read `.agents/state/current-milestone.md`, `.agents/rules/07-feature-graph.md` and the shipped `specs/*.md` related to the idea, to learn what already exists.
   - Never ask the human something the repo already answers. Cite what was found ("RFC 010 already captures amenities during registration").
2. **Ask in Short Rounds**:
   - 1 to 4 questions per round, each with 2 to 4 concrete options and a recommended default (first option, marked Recommended).
   - Later rounds depend on earlier answers; do not send the full checklist at once.
3. **Cover These Dimensions, in Order**:
   - **Who and why**: which user (e.g. Don Carlos, senior ergonomics) and what pain it removes.
   - **Smallest useful slice**: the one behavior that delivers value alone; everything else is deferred.
   - **Non-goals**: what is explicitly out, named one by one.
   - **User-visible behavior**: what the user sees and does, by text, voice or chat, in plain words. Not which components or hooks.
   - **Relationship to existing behavior**: what it extends, changes or must not break among shipped features (from the feature graph).
   - **Product constraints**: accessibility for senior users, platforms (iOS, Android), offline needs, privacy of personal data, cost or quota limits.
   - **Done signal**: how the human will know it works, phrased as an observable outcome.
4. **Apply the Ponytail Check at Product Level**:
   - For every proposed behavior, ask if it can be skipped or is already covered by existing behavior. Push scope down, not up.
5. **Size Gate**:
   - The result must be small enough for one RFC and one branch. If not, split into ordered slices and scope only the first.
6. **Park Implementation Talk**:
   - When the human raises how (a table, a library, an endpoint), do not decide it. Record it under Hand-off Notes for the architecture step and return to the what.
7. **Play Back the Scope Brief and Get a Yes**:
   - Present the brief below and wait for explicit approval. Adjust and re-present on changes.

---

## Scope Brief Format

```
Feature:        <name>, next RFC number <NNN>
Problem:        <one or two sentences>
User:           <who>
In scope:       <bulleted, smallest slice, in user-visible terms>
Non-goals:      <bulleted>
Existing behavior affected: <shipped features and RFCs it extends or must not break>
Constraints:    <accessibility, platforms, privacy, cost or quota>
Done signal:    <observable acceptance>
Deferred:       <follow-up slices, if split>
Hand-off notes: <implementation ideas the human raised, and open questions for the architects>
```

On approval, the brief is the input to `architecture-team` (`/arch-team`), which decides how it is built and drafts the RFC in `specs/` and any ADR. The brief is not committed on its own.

---

## Anti-Rationalization Table

| Common Agent Excuse | Why It Fails | Mandatory Response |
| :--- | :--- | :--- |
| *"The request is clear enough, I'll assume the details."* | Assumed details become unreviewed scope in the design. | Ask the dimension that is unclear, with a recommended default. |
| *"I'll ask everything up front to save time."* | Long questionnaires get shallow answers and ignore dependencies between them. | Ask 1 to 4 questions per round and adapt to the answers. |
| *"Adding this related capability now is cheap."* | Scope only grows here; each addition needs its own design, tests and review. | Put it under Deferred, not In scope. |
| *"Let me settle the tables and endpoints now so the next step is easier."* | Design choices made without the architecture squad skip its security, topology and QA review. | Record it under Hand-off notes and stay on what the user sees and does. |
| *"The human said yes to the idea, so scope is approved."* | Approving an idea is not approving its boundaries. | Play back the full brief and wait for explicit approval. |

---

## Verification Criteria
- [ ] Repo context (milestone, feature graph, related specs) was read before the first question.
- [ ] Every dimension above was answered or explicitly marked not applicable.
- [ ] Non-goals are listed and the slice fits one RFC and one branch.
- [ ] The brief contains no design decisions; implementation ideas sit under Hand-off notes.
- [ ] The human approved the scope brief in the current conversation.
- [ ] Next step handed to `architecture-team` with the next free RFC number.
