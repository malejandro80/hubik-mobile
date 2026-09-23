# RFC 029: Role-Aware Start Screen

- **Author**: AI Agent (Claude Code)
- **Status**: Under Review
- **Created**: 2026-09-23
- **Target Release / Milestone**: MVP 1.0 - AI Real Estate Assistant

---

## 1. Problem Statement & Motivation
The home start screen (RFC 016) only varied its action cards by role. Every role got the same
subtitle ("¿Qué quiere hacer hoy?") and the same four examples, two of which returned no results
against the real inventory ("…en Madrid", "…900 euros": all listings are in Valencia, in USD).
The client could create an agency but had no card for it. The user asked to tailor the options
and messages to the signed-in role; content approved on 2026-09-23.

---

## 2. Goals & Explicit Non-Goals

### Goals
- [x] Audience derived from the session: visitor (signed out, loading, or no role), client,
      agent, owner.
- [x] Subtitle per audience: "Encuentre su próxima vivienda" / "¿Qué vivienda busca hoy?" /
      "¿Qué va a publicar o buscar hoy?" / "Gestione su inmobiliaria y su equipo".
- [x] Main task first: owner → Mi inmobiliaria, agent → Publicar; client gets
      "Crear mi inmobiliaria" (→ `/create-agency`); visitor keeps Iniciar sesión.
- [x] Examples per audience, each verified live to return results: search examples for
      visitors and clients, inventory examples for agents and owners.

### Non-Goals (Out of Scope)
- Other screens, the burger menu, the slash menu.
- Fetching examples dynamically from the inventory.

---

## 3. Public Contracts
```typescript
// src/lib/startActions.ts
export type StartActionKey = 'search' | 'sign_in' | 'register' | 'my_agency' | 'create_agency';
export type StartAudience = 'visitor' | Role;
export function getStartActions(capabilities: RoleCapabilities, status: AuthStatus): StartActionKey[];
export function getStartAudience(status: AuthStatus, role: Role | null): StartAudience;

// src/constants/startScreen.ts
export const SEARCH_EXAMPLES: string[];
export const INVENTORY_EXAMPLES: string[];
export const START_EXAMPLES_BY_AUDIENCE: Record<StartAudience, string[]>;
```
`useStartScreen` returns `audience`; `StartScreen` takes `audience` and shows
`labels.startScreen.subtitles[audience]`.

---

## 4. Verification
- [x] Unit: action order per role, audience mapping, examples/subtitle per audience,
      create-agency route.
- [x] Screen: each role sees its subtitle, first task and examples.
- [x] Live: all 8 examples return results. "La casa más barata con parrillera" was replaced by
      "…con jardín" because the price sort surfaced a house without a parrillera (RFC 027
      follow-up).
- [x] Simulator: an agent account sees the agent subtitle, Publicar first and inventory examples.
- [x] `npm run lint`, `npm test`, `npm run typecheck`.
