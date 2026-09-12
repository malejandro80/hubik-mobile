# Workspace Rule: Session Handoff & Memory Protocol

To prevent context drift and eliminate the "cold start" amnesia across development sessions, every significant task or session must conclude with a handoff entry.

## 📝 The Handoff Procedure
Before concluding a conversation turn where files were modified, verified, or committed:

1. Update `.agents/state/session-log.md` with an entry formatted as:
   ```markdown
   ### [YYYY-MM-DD HH:MM] Session: <Brief Title>
   - **Status**: Completed / In-Progress / Blocked
   - **Changes Made**:
     - <file 1>: <what changed>
     - <file 2>: <what changed>
   - **Verification**: Output of `scripts/verify.sh` (tests passing, lints clean).
   - **Commit**: `<commit hash>` - `<commit message>` (if committed).
   - **Next Actions**: Exact 1-2 steps for the next session or incoming agent.
   ```
2. Update `.agents/state/current-milestone.md` if the active milestone or task progress has shifted.
3. Verify that all temporary scratch files are purged before completing the session.
