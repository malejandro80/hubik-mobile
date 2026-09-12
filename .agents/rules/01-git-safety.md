# Workspace Rule: Git Safety & Control Protocol

All agents operating in this repository must adhere to these operational constraints for version control.

## 🚫 Strictly Prohibited Actions
1. **No Autonomous Push**: Never run `git push` or `git push --force`. The human developer is the sole release authority.
2. **No Destructive Rebasing**: Never rebase or squash shared branches (`main`, `master`, `develop`) autonomously.
3. **No Unreviewed Hard Resets**: Never execute `git reset --hard` without explicit confirmation from the human developer.

## ✅ Permitted Git Operations
1. Exploratory inspections: `git status`, `git diff`, `git log -n 5 --oneline`, `git branch`.
2. Staging specific modified files: `git add <explicit-file-path>`.
3. Creating local feature branches: `git checkout -b feature/<descriptive-name>`.
4. Creating atomic commits conforming to Conventional Commits:
   - `feat: <description>` (new feature or capability)
   - `fix: <description>` (bug fix)
   - `refactor: <description>` (code improvement without behavior change)
   - `test: <description>` (adding or correcting tests)
   - `docs: <description>` (documentation updates)
   - `chore: <description>` (tooling, dependencies, maintenance)

## 🛡️ Pre-Commit Safeguards
- Always inspect `git diff --staged` before committing.
- Ensure no `.env`, API keys, database credentials, or AI scratch files (`.gemini/`, `scratch/`) are staged.
- Ensure every commit represents a coherent, atomic increment with passing verification.
