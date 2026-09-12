#!/usr/bin/env bash
# ==============================================================================
# Pre-Commit Guardrail & Secret Quarantine Hook
# ==============================================================================
# Scans staged files for sensitive tokens, credentials, and untracked AI scratchpads.
# ==============================================================================

set -eo pipefail

echo "🔒 [pre-commit] Scanning for sensitive credentials and scratch files..."

# Check 1: Forbidden files staged
FORBIDDEN_FILES=$(git diff --cached --name-only 2>/dev/null | grep -E '((^|/)\.env($|\..*)|\.pem$|\.key$|\.cert$|scratch/|\.gemini/|\.antigravity/)' || true)
if [ -n "${FORBIDDEN_FILES}" ]; then
    echo "❌ [SECURITY ALERT] Staging forbidden or sensitive files is prohibited:"
    echo "${FORBIDDEN_FILES}"
    echo "Remove with: git reset HEAD <file>"
    exit 1
fi

# Check 2: Pattern scan for high-entropy secrets in staged diffs
STAGED_DIFF=$(git diff --cached -U0 2>/dev/null || true)
if [ -n "${STAGED_DIFF}" ]; then
    # Matches common secret formats
    SECRET_MATCHES=$(echo "${STAGED_DIFF}" | grep -Ei '(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{30,}|AKIA[0-9A-Z]{16}|bearer [a-zA-Z0-9_\-\.]{30,}|postgres://[a-zA-Z0-9]+:[a-zA-Z0-9]+@|mongodb(\+srv)?://[a-zA-Z0-9]+:[a-zA-Z0-9]+@)' || true)
    if [ -n "${SECRET_MATCHES}" ]; then
        echo "❌ [SECURITY ALERT] Potential secret or credential pattern detected in staged diff:"
        echo "${SECRET_MATCHES}" | head -n 5
        echo "Scrub these credentials and use environment variables instead."
        exit 1
    fi
fi

echo "✅ [pre-commit] Clean: No secrets or prohibited files detected."
exit 0
