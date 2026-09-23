# RFC 024: Design System v2 ("Serene Hearth, refined") & Branded Splash

- **Author**: AI Agent (Claude Code)
- **Status**: Approved
- **Created**: 2026-09-22
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
Hubik has a named identity ("Serene Hearth": forest green, warm off-white, serif headlines) in
`src/theme/colors.ts`, but the 35 `*.styles.ts` files mostly bypass it. An audit of this session
found:

| Signal | Count |
| :--- | :--- |
| Literal `fontSize` values | 141 (15 distinct sizes, 11-32pt; most common 15, 16, 13) |
| `typography.*` token references | 41 |
| Literal padding/margin values | 256 |
| Literal `fontWeight` values | 93 |
| Ad-hoc shadow/elevation declarations | 35 |
| Hardcoded color literals outside the theme | ~25 (8 in `PropertyCard.styles.ts`) |

The declared tokens also have WCAG AA gaps: `tertiary` text on the background is 4.14:1 (needs
4.5), and input borders are 1.4:1 light / 2.0:1 dark (needs 3:1 as a component boundary).
The splash is Expo's default green "H" on white, which doesn't match the icon (cream "H" on green).

The result reads as many small, slightly different designs instead of one calm, minimal system.

Scoped with the `scope` skill (two rounds + clarifications, this session); the human approved the brief.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] A small, closed set of design tokens (color, type, spacing, radius, elevation), light + dark,
      that evolves Serene Hearth rather than replacing it.
- [x] Every text/background token pair meets WCAG AA in both modes, enforced by a unit test.
- [x] The shared components listed in §4.3 use only tokens (no literal colors, font sizes,
      weights, spacing, radii or shadows).
- [x] A branded native splash (refined "H" + "Hubik" wordmark, cream on green, dark variant) that
      fades into the first screen once the app is ready.
- [x] The app icon/adaptive icon use the same refined "H" (no wordmark).

### Non-Goals (Out of Scope)
- Animations, micro-interactions, screen/sheet transitions, haptics (RFC 025).
- Icon audit/replacement (RFC 026).
- Per-screen layout redesign of `src/app/*.styles.ts` (RFC 027+). Screens pick up the new look
  only through the shared components and the updated token *values*.
- Custom fonts; new brand colors; animated splash handoff.
- Any behavior, copy, data, navigation or accessibility-label change.

---

## 3. User Stories & Acceptance Criteria

- **Story 1 (Consistent look)**
  - **Given** any screen built from the shared components
  - **When** it renders in light or dark mode
  - **Then** text uses one of the type-ramp roles, spacing is on the 4pt scale, and surfaces use
    one of three elevation levels, so all screens look like one product.

- **Story 2 (Readable for everyone)**
  - **Given** any text token on any surface token it's paired with
  - **When** contrast is measured
  - **Then** it is ≥ 4.5:1 (≥ 3:1 for text ≥ 24pt / 18.66pt bold, and for input/control borders),
    in light and dark. Enforced by `src/theme/__tests__/contrast.test.ts`.

- **Story 3 (Branded launch)**
  - **Given** a cold start on iOS or Android
  - **When** the app launches
  - **Then** a refined "H" with the "Hubik" wordmark appears, cream on brand green (dark-mode
    variant on the dark background), and fades into the first screen once auth has loaded,
    with no white flash.

- **Story 4 (Nothing else changes)**
  - **Given** the existing test suite
  - **When** it runs
  - **Then** every behavior assertion passes unchanged. Only assertions on concrete style values
    may be updated, each listed in the PR description.

---

## 4. Proposed Architecture & Public Contracts

### 4.1 Token modules (`src/theme/`)
`colors.ts` grows past its single responsibility today (colors, typography, shapes, spacing,
hit slop). Split into one file per token family, re-exported from a barrel:

```
src/theme/
  palette.ts      raw brand colors (never imported by components)
  colors.ts       semantic light/dark roles -> ThemeColors  (existing import path kept)
  typography.ts   type ramp
  spacing.ts      4pt scale + touch sizes + hitSlop (moved)
  radii.ts        corner radii
  elevation.ts    3 cross-platform shadow levels
  index.ts        barrel
```

**Semantic colors** (existing `ThemeColors` keys kept so the 72 files importing it keep compiling;
values change, and three roles are added: `textTertiary`, `borderStrong`, `surfaceMuted`):

| Role | Light | Dark | Notes |
| :--- | :--- | :--- | :--- |
| `background` | `#FAF9F6` | `#0F1312` | warm ivory / near-black green |
| `surface` / `card` | `#FFFFFF` | `#171B1A` | |
| `surfaceMuted` (new) | `#F2F1EC` | `#202523` | chips, input fill, user bubble |
| `text` | `#1A1D1C` | `#F2F4F2` | 16-17:1 |
| `textSecondary` | `#4A5250` | `#BFC7C4` | ≥7:1 |
| `textTertiary` (new) | `#5E6A66` | `#94A09C` | ≥4.98:1, replaces `tertiary` for text |
| `primary` | `#1A3A34` | `#A9CFC5` | brand green, unchanged in light |
| `onPrimary` / `primaryText` | `#FAF9F6` | `#0B2520` | 11.7 / 9.6:1 |
| `secondary` (accent) | `#2C685A` | `#8FD0BE` | ≥5.7:1 |
| `border` | `#E6E4DE` | `#2A302E` | decorative hairlines only |
| `borderStrong` (new) | `#7F8985` | `#6E7875` | inputs/controls, ≥3.19:1 |
| `error` | `#B3261E` | `#F2B8B5` | ≥5.8:1 |

The existing Material-style `surfaceContainer*` / `on*Container` keys stay as aliases of the
roles above for the screen files not migrated in this RFC; RFC 027 removes them.

**Type ramp** (`typography.ts`): body 16pt as agreed in scope, `allowFontScaling` left at the
RN default (on), `maxFontSizeMultiplier` not capped. Serif (Georgia / Android `serif`) only for
`display` and `title`; system sans for everything else.

| Role | Size / line | Weight | Family |
| :--- | :--- | :--- | :--- |
| `display` | 30 / 38 | 600 | serif |
| `title` | 22 / 30 | 600 | serif |
| `headline` | 18 / 26 | 600 | sans |
| `body` | 16 / 24 | 400 | sans |
| `bodyStrong` | 16 / 24 | 600 | sans |
| `label` | 15 / 20 | 600 | sans (buttons, chips) |
| `caption` | 13 / 18 | 500 | sans (metadata only, never sole carrier of meaning) |

Six sizes instead of fifteen, three weights (400/500/600) instead of the current mix.

**Spacing** `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`; `touchMin 48`,
`touchDefault 52` (above the 44pt/48dp platform minimum). Existing `spaceXS...` keys kept as
aliases mapped onto the new scale until RFC 027.

**Radii** `sm 8 · md 12 · lg 16 · xl 24 · full 9999` (drops `4`, rarely used, visually noisy).

**Elevation** - minimalism leans on hairline borders and tonal surfaces, not heavy shadows:
`none`, `raised` (cards: 1px `border` + very soft shadow), `overlay` (sheets, menus, popovers).
Each level is a `ViewStyle` built with `Platform.select` (iOS `shadow*`, Android `elevation`,
web `boxShadow`), and dark mode relies on tonal surface shifts rather than shadows.

### 4.2 Contracts
```typescript
// src/theme/typography.ts
export type TypeRole = 'display' | 'title' | 'headline' | 'body' | 'bodyStrong' | 'label' | 'caption';
export const typography: Record<TypeRole, TextStyle>;

// src/theme/elevation.ts
export type ElevationLevel = 'none' | 'raised' | 'overlay';
export function elevation(level: ElevationLevel, theme: ThemeColors): ViewStyle;

// src/theme/contrast.ts (pure, used by the test and nothing at runtime)
export function contrastRatio(foreground: string, background: string): number;
export const CONTRAST_PAIRS: readonly ContrastPair[];
```

### 4.3 Shared components migrated in this RFC
The ones that appear on most screens. Each `*.styles.ts` is rewritten to use tokens only.
The component `.tsx` files don't change unless a style prop's name changes.

`Button`, `Header`, `ChatMessageItem`, `ChatInputBar`, `ScreenChatBar`, `SuggestionChips`,
`PropertyCard`, `BurgerMenu`, `DrawerProfileCard`, `SlashCommandMenu`, `InstallSheet`,
`InstallBar`, `PropertyStatsBar`, `PropertyAgentCard`, `PropertyDescriptionSection`,
`PropertyMapPreview`, `StartScreen`.

Not in this list (and not touched): draft/registration panels, photo grid/gallery/order modal,
map picker, agency/agents screens, the share page. They inherit the new token *values* and are
polished in RFC 027.

A lint guard keeps the migrated files token-only: an ESLint `no-restricted-syntax` rule scoped to
those 17 files, rejecting numeric literals on `fontSize`, `fontWeight`, `padding*`, `margin*`,
`borderRadius`, and hex/rgb string literals. (Border widths of `1`/`StyleSheet.hairlineWidth`,
`0`, flex values and percentage/layout sizes stay allowed.)

### 4.4 Splash & icon
- Add `expo-splash-screen` (Expo SDK 57 compatible version via `npx expo install`) and configure it
  through its config plugin in `app.json` (replacing the legacy top-level `splash` key):
  `image` = `assets/splash-icon.png`, `imageWidth` ≈ 200, `backgroundColor` `#1A3A34`,
  `dark: { image: assets/splash-icon-dark.png, backgroundColor: #0F1312 }`.
- `src/app/_layout.tsx`: `SplashScreen.preventAutoHideAsync()` at module scope;
  `SplashScreen.setOptions({ fade: true, duration: 250 })`; `hideAsync()` once `AuthProvider`
  reports its initial session load. Plus a 3s safety timeout so an auth hang never
  traps the user on the splash.
- **Refined mark**: the block "H" redrawn with lighter, slightly tapered stems and a crossbar that
  rises into a shallow gable (a house roof), cream `#FAF9F6`. Splash image = mark + "Hubik" set in
  Georgia beneath it. Icon / adaptive icon = mark only. Sources kept as SVG under
  `assets/brand/`, PNGs rendered from them by `scripts/brand/render-brand.py` (Pillow, already
  available locally; no new npm dependency) so the assets are reproducible.
- Native projects are generated (CNG, `ios/` gitignored), so the splash is verified with
  `npx expo prebuild --clean` + `npx expo run:ios`. No native files committed.

### 4.5 Data models & state
None. No DB, API or persisted-state change.

---

## 5. Security & Error Handling

### Trust Boundaries & Sanitization
No new trust boundary, input or network call. `expo-splash-screen` is a first-party Expo module,
and the render script runs only locally at authoring time. It isn't shipped.

### Failure Modes
| Failure Condition | Handling Strategy |
| :--- | :--- |
| Auth initial load never resolves | 3s safety timeout calls `hideAsync()`; app continues as signed-out, same as today's behavior when auth is slow |
| `hideAsync()` rejects (splash already hidden, e.g. fast refresh) | Caught and ignored |
| A future token change breaks contrast | `contrast.test.ts` fails in CI |
| A migrated style file reintroduces a literal | ESLint error in `npm run lint` |
| Web (share page `/p/<slug>`) | `expo-splash-screen` is a no-op on web; share page unaffected |

---

## 6. Verification & Test Plan
- [x] Unit: `contrastRatio` against known WCAG reference values (black/white = 21, equal = 1).
- [x] Unit: every `CONTRAST_PAIRS` entry meets its `min` in light and dark.
- [x] Unit: `typography` exposes exactly the 7 roles; body is 16pt; only `display`/`title` are serif.
- [x] Unit: `elevation('none')` adds no shadow; `raised`/`overlay` differ per platform.
- [x] Unit: `useSplashHandoff` (used by `SplashGate` in `_layout`) hides the splash after auth resolves, and after the timeout when it doesn't.
- [x] Lint: the token-only rule passes on the 17 migrated files (and fails on a seeded literal, checked once manually).
- [x] Regression: `npm run typecheck`, `npm run lint`, `npm test` green. Behavior assertions untouched.
- [ ] Manual (human done-signal): simulator walkthrough, light + dark: chat, property detail,
      sign-in, burger menu, agency; cold-start splash on iOS; icon on the home screen.

---

## 7. Follow-up RFCs (from the approved scope)
- **025 Motion & transitions**: 150-250ms fades/scale on press, screen and sheet transitions,
  light haptics, all disabled under OS Reduce Motion.
- **026 Icon audit**: consistent Ionicons set/weight and sizes across the app.
- **027+ Per-screen polish**: migrate the remaining `src/app/*.styles.ts` and panels, then remove
  the legacy token aliases.
