# CLAUDE.md

Operating rules for Claude Code in `hubik-mobile`. This repo already has a thorough governance framework under `.agents/` and `antigravity/instructions.md`, written for other agent tools (Antigravity, and a LangGraph-based "architecture-team" squad). Claude Code doesn't run that literal 8-phase, multi-persona pipeline — there's no `architecture-team` slash-command here — but the underlying constraints are tool-agnostic and apply just the same. This file distills them into what actually changes how I work in this repo.

## Source of truth (read when in doubt)
- `.agents/rules/*.md` — binding constraints, summarized below. Includes
  `.agents/rules/07-feature-graph.md`, a static Mermaid map of how the shipped RFCs and their
  modules/DB columns depend on each other — check it before touching shared code
  (`chatApi.ts`, `usePropertyRegistrationChat`, the `properties` table).
- `.agents/references/*.md` — deeper checklists (Definition of Done, security, testing patterns).
- `.agents/state/session-log.md` / `current-milestone.md` — project memory across sessions.
- `specs/*.md` — approved feature RFCs (template: `specs/000-spec-template.md`).
- `AGENTS.md` (root) — the original persona-framed version of the same rules.

## Golden rules
1. **Human release authority**: never `git push`, force-push, `git reset --hard`, or rebase a shared branch without explicit approval in the current conversation. Building and verifying locally is fine; shipping is not mine to decide.
2. **YAGNI / Ponytail ladder**: before adding code, stop at the first rung that satisfies the need — skip it entirely → reuse what's already in the codebase → standard library / RN API → Expo module → installed dependency → one-line helper → minimal new code. Don't add abstractions, config, or parameters nobody asked for.
3. **Scope, then architecture and spec, before non-trivial code**: a vague feature idea is first limited with the `scope` skill (`.agents/skills/scope/SKILL.md`), which asks focused questions and produces a scope brief of *what* is built, approved by the human. That brief is the input to the architecture step (`architecture-team`), which decides *how* it is built. A new feature gets a numbered RFC in `specs/` before implementation (see `specs/004-chat-guided-property-registration.md` for the expected shape). Write the failing test first (TDD), then the minimal implementation.
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

## Supabase deploys (Claude owns these)
Claude takes over every Supabase deploy: SQL migrations, Edge Functions and their verification. The route is the project skill `.agents/skills/supabase/SKILL.md` (read it first): the Supabase MCP server (`execute_sql` / `apply_migration`, `deploy_edge_function`, `get_advisors`), not ad-hoc CLI commands.
- Target project is `wbzfeqzvwfglirwlpzpy` ("hubik mobile"). The account's other project, `xbirlummltqnesuzdlov` ("houseApp"), is a different app; never deploy there.
- Before applying: scan `https://supabase.com/changelog.md` for breaking changes and walk the skill's security checklist (views `security_invoker`, `SECURITY DEFINER` functions, RLS, storage policies).
- After applying: verify with a test query and run advisors. Remote migration history has timestamped versions that differ from the local date-only filenames (applied through MCP), so do not use `supabase db push`.
- If the MCP tools are not visible in a session, the user must authenticate the Supabase MCP server (OAuth in the browser) and reload the session; do not fall back to the CLI.
- `git push` and releases remain the human's call.

## MCP servers configured for this project
Supabase is wired into Claude Code through the repo-root `.mcp.json` (project `wbzfeqzvwfglirwlpzpy`). GitHub is set up in `mcp_config.json` but **not yet wired into Claude Code**:
- **Supabase** — remote MCP at `mcp.supabase.com`, scoped to project `wbzfeqzvwfglirwlpzpy`, with `docs, account, database, debugging, development, functions, branching` features enabled. Config: `mcp_config.json`, `.agents/plugins/supabase/mcp_config.json`.
- **GitHub** — official `@modelcontextprotocol/server-github` via `npx`, needs `GITHUB_PERSONAL_ACCESS_TOKEN` in the environment. Config: `mcp_config.json`, `.agents/plugins/github/mcp_config.json`.

To wire GitHub into Claude Code as well, add it to the repo-root `.mcp.json` mirroring the tracked config shape — reference `${GITHUB_PERSONAL_ACCESS_TOKEN}` as an env var, never a literal token.

⚠️ **Finding from this review**: `.antigravity/mcp.json` (gitignored, never committed — confirmed via `git log`/`git check-ignore`, so it hasn't leaked into git history) has a **live GitHub PAT hardcoded in plaintext** instead of the `${GITHUB_PERSONAL_ACCESS_TOKEN}` placeholder every tracked config uses. Worth rotating that token and replacing the value with the env-var reference, consistent with this project's own secret-quarantine rule.
