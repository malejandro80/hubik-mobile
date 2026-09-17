# CLAUDE.md

Operating rules for Claude Code in `hubik-mobile`. This repo already has a thorough governance framework under `.agents/` and `antigravity/instructions.md`, written for other agent tools (Antigravity, and a LangGraph-based "architecture-team" squad). Claude Code doesn't run that literal 8-phase, multi-persona pipeline — there's no `architecture-team` slash-command here — but the underlying constraints are tool-agnostic and apply just the same. This file distills them into what actually changes how I work in this repo.

## Source of truth (read when in doubt)
- `.agents/rules/*.md` — binding constraints, summarized below.
- `.agents/references/*.md` — deeper checklists (Definition of Done, security, testing patterns).
- `.agents/state/session-log.md` / `current-milestone.md` — project memory across sessions.
- `specs/*.md` — approved feature RFCs (template: `specs/000-spec-template.md`).
- `AGENTS.md` (root) — the original persona-framed version of the same rules.

## Golden rules
1. **Human release authority**: never `git push`, force-push, `git reset --hard`, or rebase a shared branch without explicit approval in the current conversation. Building and verifying locally is fine; shipping is not mine to decide.
2. **YAGNI / Ponytail ladder**: before adding code, stop at the first rung that satisfies the need — skip it entirely → reuse what's already in the codebase → standard library / RN API → Expo module → installed dependency → one-line helper → minimal new code. Don't add abstractions, config, or parameters nobody asked for.
3. **Spec before non-trivial code**: a new feature gets a numbered RFC in `specs/` before implementation (see `specs/004-chat-guided-property-registration.md` for the expected shape). Write the failing test first (TDD), then the minimal implementation.
4. **Never tamper with tests**: don't weaken, skip, or comment out an existing assertion to make a suite pass. A failing assertion means the implementation is wrong, unless the user explicitly changed the requirement — and if so, say so in the commit message.
5. **Modularity**: keep source files under ~300 lines; one responsibility per module/hook/component. Split before it grows, don't refactor speculatively beyond what the task touches.

## Verification before calling anything done
Run `scripts/verify.sh check-all`, or the equivalent npm scripts directly: `npm run lint`, `npm test`, `npm run typecheck` (`tsc --noEmit`). Paste the actual passing output — don't assert green without having run it in this session. `.kilo/worktrees/**` is a separate parallel worktree; ignore it when it shows up in test/grep output, it's not part of this working tree's changes.

## Mobile / Expo standards (`.agents/rules/06-mobile-development.md`)
- Every screen wraps content in `SafeAreaView` (`react-native-safe-area-context`) or uses `useSafeAreaInsets()`.
- Touch targets ≥ 44×44pt (iOS) / 48×48dp (Android).
- Lists use `FlatList`/`FlashList` with a `keyExtractor` — never `.map()` over data inside a `ScrollView`.
- Interactive elements get `accessibilityRole`, `accessibilityLabel`, and `accessibilityState`.
- Respect light/dark mode via `src/theme/colors.ts` + `useColorScheme()`, not hardcoded colors.

## Security
- Treat all external input (API responses, deep-link params, user text) as untrusted; validate at the boundary.
- No hardcoded secrets, ever — read from env vars only. `.env` stays gitignored.
- `expo-secure-store` for tokens/PII; never plain `AsyncStorage` for sensitive data.
- Supabase writes from privileged Edge Functions (service-role key) when there's no RLS policy for the client to do it directly — see `supabase/functions/property-publish` for the pattern.
- Full checklist: `.agents/references/security-checklist.md`.

## Session handoff
After a session with non-trivial changes, append an entry to `.agents/state/session-log.md` (template in `.agents/rules/05-session-handoff.md`) and update `.agents/state/current-milestone.md` if the milestone shifted. This is how the next session picks up context without re-deriving it from scratch.

## Multi-agent orchestration
`antigravity/instructions.md` and `scripts/architecture-team/` describe a mandatory 8-phase pipeline with named personas (Mobile Lead, Systems Architect, Security Specialist, QA, Gatekeeper) run as a LangGraph graph — that's Antigravity/Kilo tooling, not something Claude Code invokes. The spirit still applies: explore before touching code, get the spec agreed before implementing, review before shipping. Use the `Agent` tool for a genuinely independent second opinion, parallel research, or an isolated multi-step task — not as a required step on every change; over-spawning subagents for small tasks is worse than just doing the work directly.

## MCP servers configured for this project
Two MCP servers are already set up for AI tooling here, but **not yet wired into Claude Code** (no `.mcp.json` at the repo root):
- **Supabase** — remote MCP at `mcp.supabase.com`, scoped to project `wbzfeqzvwfglirwlpzpy`, with `docs, account, database, debugging, development, functions, branching` features enabled. Config: `mcp_config.json`, `.agents/plugins/supabase/mcp_config.json`.
- **GitHub** — official `@modelcontextprotocol/server-github` via `npx`, needs `GITHUB_PERSONAL_ACCESS_TOKEN` in the environment. Config: `mcp_config.json`, `.agents/plugins/github/mcp_config.json`.

If you want Claude Code itself to use these, create a `.mcp.json` at the repo root mirroring the tracked config shape — reference `${GITHUB_PERSONAL_ACCESS_TOKEN}` as an env var, never a literal token.

⚠️ **Finding from this review**: `.antigravity/mcp.json` (gitignored, never committed — confirmed via `git log`/`git check-ignore`, so it hasn't leaked into git history) has a **live GitHub PAT hardcoded in plaintext** instead of the `${GITHUB_PERSONAL_ACCESS_TOKEN}` placeholder every tracked config uses. Worth rotating that token and replacing the value with the env-var reference, consistent with this project's own secret-quarantine rule.
