# RFC 026: Typewriter Replies

- **Author**: AI Agent (Claude Code)
- **Status**: Under Review
- **Created**: 2026-09-23
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Since RFC 025, search replies are written by an LLM and can take up to ~5 s. During that wait
the chat shows nothing but the input bar's spinner, and the reply then appears all at once. The
chat does not feel like an assistant that is thinking and writing.

This RFC adds, on the client only, a "Hubik está escribiendo…" indicator while a reply is
pending and a word-by-word reveal of each newly arrived assistant reply, respecting the phone's
Reduce Motion setting. Scope brief approved by the user on 2026-09-23.

Numbering: RFC 024's session reserved 025/026 for motion and icon work; 025 went to LLM-grounded
search answers and 026 to this feature, so those follow-ups move to 027+.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] While a home-chat reply is pending (text or voice), a typing indicator with the text
      "Hubik está escribiendo…" shows at the end of the conversation.
- [x] A newly arrived assistant reply reveals its text word by word; its property cards and
      suggestion chips appear only once the text is complete.
- [x] Only replies that arrive while the screen is open animate; messages already in the
      conversation when the screen mounts, and a reply that finished writing, show instantly
      (no re-animation on list re-render or recycling).
- [x] The list stays scrolled to the bottom while a reply is written.
- [x] Reduce Motion on: replies show instantly and the indicator does not animate.
- [x] Screen readers get the full reply text once, not word by word.

### Non-Goals (Out of Scope)
- Server-side token streaming; `chat-query` and other Edge Functions are unchanged.
- Input autocomplete.
- Tap-to-finish and a total-duration cap.
- Chats on other screens (agency screen, `ScreenChatBar`).
- The rest of RFC 024's motion & transitions work.

---

## 3. User Stories & Acceptance Criteria
- **Story 1 - thinking indicator**:
  - **Given** the user sent "pisos en Valencia"
  - **When** the search is still running
  - **Then** "Hubik está escribiendo…" shows below the last message and disappears when the
    reply arrives.
- **Story 2 - reply writes itself**:
  - **Given** the reply arrived with 9 properties and suggestions
  - **When** it is displayed
  - **Then** its text grows word by word, and the cards and chips appear after the last word.
- **Story 3 - no replays**:
  - **Given** the user leaves and returns to the chat, or scrolls, or a newer message arrives
  - **Then** earlier replies are shown complete, immediately.
- **Story 4 - Reduce Motion**:
  - **Given** Reduce Motion is on
  - **Then** replies, cards and chips show at once and the indicator is static.

---

## 4. Proposed Architecture & Public Contracts

```typescript
// src/constants/typewriter.ts
export const TYPEWRITER_WORD_INTERVAL_MS: number;

// src/lib/typewriter.ts (pure)
export function countWords(paragraphs: MessageParagraph[]): number;
export function revealParagraphs(paragraphs: MessageParagraph[], words: number): MessageParagraph[];

// src/hooks/useReduceMotion.ts
export function useReduceMotion(): boolean;   // AccessibilityInfo + change listener

// src/hooks/useTypewriter.ts
export function useTypewriter(
  paragraphs: MessageParagraph[],
  animate: boolean,
  onDone?: () => void,
  onProgress?: () => void,
): { visible: MessageParagraph[]; done: boolean };

// src/hooks/useNewReply.ts (home screen)
export function useNewReply(messages: ChatMessage[]): {
  writingId: string | null;          // id of the assistant reply that should animate
  finishWriting: (id: string) => void;
};

// src/components/TypingIndicator.tsx
export const TypingIndicator: React.FC;

// ChatMessageItem gains:
//   animate?: boolean; onWritten?: () => void; onWriteProgress?: () => void;
```

- Words are revealed across the parsed paragraphs/segments (`parseMessageParagraphs`), so bold
  `**markers**` never show raw mid-animation.
- `useNewReply` records the message ids present at mount; the last message animates only if it
  is an assistant message that was not present at mount and has not finished writing.
- `index.tsx` renders `TypingIndicator` as the list footer while `loading`, passes `animate`
  only to `writingId`, and scrolls to the end on write progress.
- The assistant bubble keeps `accessibilityLabel` = full text while animating.

### Data Models & State Changes
None (client-only, in-memory).

---

## 5. Security & Error Handling
No new input or network surface. Timers are cleared on unmount; a reply whose text is empty
shows its cards immediately.

| Failure Condition | Handling Strategy |
| :--- | :--- |
| `AccessibilityInfo.isReduceMotionEnabled` unavailable/rejects | Treat as off (animate) |
| Component unmounts mid-animation | Interval cleared, no state update |
| New reply arrives while one is writing | Previous one is shown complete, new one animates |

---

## 6. Verification & Test Plan
- [x] Unit: `countWords` / `revealParagraphs` reveal across segments and paragraphs, keep bold
      segments bold, return everything when `words >= total`.
- [x] Hook: `useTypewriter` grows by one word per interval, reports progress and done; with
      `animate = false` it is complete at once.
- [x] Hook: `useReduceMotion` reads the setting and follows change events.
- [x] Hook: `useNewReply` ignores messages present at mount and user messages; animates a new
      assistant reply until `finishWriting`.
- [x] Component: `ChatMessageItem` hides cards/chips until done, exposes the full text as its
      accessibility label, and renders instantly without `animate`.
- [x] Component: `TypingIndicator` shows its label.
- [x] Screen: the indicator shows while a search is pending; the reply animates; a
      conversation restored on mount does not animate.
- [x] `npm run lint`, `npm test`, `npm run typecheck`.
