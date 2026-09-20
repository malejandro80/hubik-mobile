# ADR 0003: Sign in with Google and Apple via Supabase OAuth (Web Flow)

- **Status**: Proposed
- **Deciders**: Human Lead, Lead Mobile Architect, AI Agent
- **Date**: 2026-09-19
- **Technical Story / RFC**: [RFC 011 - Sign-in, Roles & Agencies](../../specs/011-auth-roles-agencies.md)

---

## Context and Problem Statement
The app needs Google and Apple sign-in on iOS and Android, for users including seniors, with the
session kept in `expo-secure-store` (RFC 001). Supabase Auth is already the backend and
`supabase-js` is configured. We must choose how the provider sign-in is performed on the device.

---

## Decision Drivers
- Ponytail ladder: fewest new dependencies and native configuration.
- Both providers on both platforms, working in a development build without extra native setup.
- Low ongoing operational burden.
- Sign-in that is quick and clear for senior users.

---

## Considered Options
1. **Supabase OAuth with PKCE through `expo-web-browser`**: one Expo module for both providers on
   both platforms, reuses the `hubikmobile://` scheme. The user sees a browser sheet instead of the
   native account prompt. Apple's client secret for the web flow is a JWT with a maximum lifetime of
   about six months (per Supabase's Apple guide; verify at implementation), so it must be regenerated
   and updated periodically.
2. **Native ID-token sign-in** (`expo-apple-authentication` plus `@react-native-google-signin/google-signin`,
   then `signInWithIdToken`): the smoothest native prompt, and no Apple secret rotation on iOS.
   Adds two native libraries and config plugins, does not run in Expo Go, and Apple on Android still
   needs the web flow.
3. **`expo-auth-session` with `signInWithIdToken`**: JS-only, but hand-rolls token handling for two
   providers and does not give Apple a native path.

---

## Decision Outcome
Chosen option: **1. Supabase OAuth with PKCE through `expo-web-browser`**, because it satisfies the
ladder (one Expo module, no new native libraries), supports both providers on both platforms, and
keeps the first slice small. Its costs are the browser sheet and the Apple secret rotation, which
we record as an operational task.

### Positive Consequences
- One code path for both providers and both platforms; one new dependency.
- No client secrets in the app; PKCE protects the redirect.

### Negative Consequences / Trade-offs
- Less native feel than option 2. Revisit option 2 if sign-in completion or store review is a problem.
- Apple client secret must be regenerated on a schedule; add it to the session handoff notes.
- Requires the Apple Developer Program and Google Cloud OAuth setup by the human lead.
