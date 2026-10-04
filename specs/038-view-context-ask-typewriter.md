# RFC 038: Progressive Typewriter Replies for View Context Ask

- **Author**: AI Agent (Claude Code / Antigravity)
- **Status**: Draft
- **Created**: 2026-10-04
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
In RFC 026, the main chat view (`src/app/index.tsx`) received a progressive word-by-word reveal
(typewriter effect) for assistant search answers. However, the view context chat introduced in
RFC 036 (`PropertyAskPanel` / `PropertyAskThread` on the property detail screen) displays AI
responses and clarification questions instantly as static text.

To unify the conversational user experience across all views with AI chat capabilities, this
RFC brings progressive typewriter replies to the view context ask chat (`PropertyAskThread`).

---

## 2. Goals & Explicit Non-Goals

### Goals
- [ ] A newly arrived answer in `PropertyAskThread` reveals its text word by word (35ms per word).
- [ ] When a turn returns a clarification question (`status: 'clarify'`), its question text reveals
      word by word; its option buttons and fallback hint appear only after the text finishes writing.
- [ ] Turns present when the component mounts, or turns that have already finished writing, render
      immediately without re-animating on scroll or re-render.
- [ ] Clarification rounds animate smoothly: typing the clarification question, and after an option
      is selected, typing the subsequent answer.
- [ ] Respects `useReduceMotion`: when reduce motion is enabled, all text and options display immediately.
- [ ] Screen readers receive the full answer or question text immediately via `accessibilityLabel`
      on the reply bubble without waiting for animation.
- [ ] The thread list auto-scrolls downward smoothly as words are progressively revealed.

### Non-Goals (Out of Scope)
- Changes to backend Edge Functions (`property-ask`).
- Modifying `ScreenChatBar` (command-based agency bar confirmed out of scope).
- Server-side streaming / SSE tokens.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - progressive answer reveal**:
  - **Given** a user asks a question on the property detail
  - **When** the answer arrives with `status: 'done'`
  - **Then** the answer text is revealed word by word.
- **Story 2 - clarification options gated by writing completion**:
  - **Given** the user's question triggers a clarification
  - **When** the clarification arrives
  - **Then** the clarification question is revealed word by word, and option buttons appear only once done.
- **Story 3 - mount and scroll stability**:
  - **Given** turns restored on mount, or a turn that has completed writing
  - **When** the view re-renders or the user scrolls
  - **Then** text is displayed completely without re-animating.
- **Story 4 - accessibility & motion preferences**:
  - **Given** Reduce Motion is enabled
  - **Then** text and options appear immediately without animation.

---

## 4. Proposed Architecture & Public Contracts

```typescript
// src/lib/askTurnKey.ts
export function resolveTurnStageKey(turn: AskTurn | undefined): string | null;

// src/hooks/useNewAskTurn.ts
export function useNewAskTurn(turns: AskTurn[]): {
  writingStageKey: string | null;
  finishWriting: (stageKey: string) => void;
};

// src/components/PropertyAskThread.tsx
export interface PropertyAskThreadProps {
  turns: AskTurn[];
  pending: boolean;
  onChoose: (option: string) => void;
  animate?: boolean;
}
```

- When an `AskTurn` is completed (`status === 'done'`), its stage key is `${turn.id}:done`.
- When an `AskTurn` asks a clarification (`status === 'clarify'`), its stage key is `${turn.id}:clarify`.
- `useNewAskTurn` tracks stage keys present at mount and stages finished writing.
- `PropertyAskThread` uses `useTypewriter` for active writing stage, reveals markdown/segments,
  and unhides clarification options once done.

---

## 5. Security & Error Handling
- No new network surface; client-side visual effect only.
- Timers cleared on unmount via existing `useTypewriter`.
- Error turns (`status: 'error'`) do not animate and render static error copy.

---

## 6. Verification & Test Plan
- [ ] Unit tests for `resolveTurnStageKey` in `src/lib/__tests__/askTurnKey.test.ts`.
- [ ] Hook tests for `useNewAskTurn` in `src/hooks/__tests__/useNewAskTurn.test.ts`.
- [ ] Component tests for `PropertyAskThread` in `src/components/__tests__/PropertyAskThread.test.tsx` verifying:
      - Progressive word reveal for answers.
      - Progressive word reveal for clarification questions, with option buttons deferred until complete.
      - Full text exposure to screen readers (`accessibilityLabel`).
      - Immediate display when `animate = false` or `useReduceMotion() === true`.
      - Prevention of re-animation for already written turns.
- [ ] Integration: `./scripts/verify.sh check-all` (lint + test + build).
