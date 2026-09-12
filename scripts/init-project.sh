#!/usr/bin/env bash
# ==============================================================================
# 10-Second Project Initializer (init-project.sh)
# ==============================================================================
# Bootstraps this template into an active project in your chosen language stack.
# Usage: ./scripts/init-project.sh --name <app-name> --stack <python|ts|go|rust>
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

NAME="my-project"
STACK=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --name) NAME="$2"; shift ;;
        --stack) STACK="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "${STACK}" ]; then
    echo "Usage: $0 --name <project-name> --stack <python|ts|go|rust>"
    exit 1
fi

echo "🚀 Initializing project '${NAME}' with stack '${STACK}'..."

# Update toolchain.env
cat <<EOF > "${ROOT_DIR}/toolchain.env"
# ==============================================================================
# Universal Toolchain Configuration (Configured for ${NAME})
# ==============================================================================
PROJECT_NAME="${NAME}"
PROJECT_LANGUAGE="${STACK}"
EOF

case "${STACK}" in
    python)
        cat <<EOF >> "${ROOT_DIR}/toolchain.env"
TEST_CMD="pytest"
LINT_CMD="ruff check ."
BUILD_CMD="python3 -m py_compile \$(git ls-files '*.py' 2>/dev/null || true)"
EOF
        mkdir -p "${ROOT_DIR}/src" "${ROOT_DIR}/tests"
        if [ ! -f "${ROOT_DIR}/pyproject.toml" ]; then
            cat <<EOF > "${ROOT_DIR}/pyproject.toml"
[project]
name = "${NAME}"
version = "0.1.0"
description = "${NAME} initialized from AI project template"
dependencies = []

[tool.pytest.ini_options]
testpaths = ["tests"]
EOF
            cat <<EOF > "${ROOT_DIR}/tests/test_smoke.py"
def test_smoke():
    assert True
EOF
        fi
        ;;
    ts|typescript)
        cat <<EOF >> "${ROOT_DIR}/toolchain.env"
TEST_CMD="npm test"
LINT_CMD="npm run lint"
BUILD_CMD="npm run build"
EOF
        mkdir -p "${ROOT_DIR}/src" "${ROOT_DIR}/tests"
        if [ ! -f "${ROOT_DIR}/package.json" ]; then
            cat <<EOF > "${ROOT_DIR}/package.json"
{
  "name": "${NAME}",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "node --test",
    "lint": "echo 'No linter configured'",
    "build": "echo 'No build step configured'"
  }
}
EOF
            cat <<EOF > "${ROOT_DIR}/tests/smoke.test.js"
import test from 'node:test';
import assert from 'node:assert';

test('smoke check', () => {
    assert.strictEqual(true, true);
});
EOF
        fi
        ;;
    go)
        cat <<EOF >> "${ROOT_DIR}/toolchain.env"
TEST_CMD="go test ./..."
LINT_CMD="go vet ./..."
BUILD_CMD="go build ./..."
EOF
        mkdir -p "${ROOT_DIR}/pkg"
        if [ ! -f "${ROOT_DIR}/go.mod" ]; then
            cat <<EOF > "${ROOT_DIR}/go.mod"
module ${NAME}

go 1.22
EOF
            cat <<EOF > "${ROOT_DIR}/main_test.go"
package main

import "testing"

func TestSmoke(t *testing.T) {
    if 1+1 != 2 {
        t.Fatal("Smoke test failed")
    }
}
EOF
        fi
        ;;
    rust)
        cat <<EOF >> "${ROOT_DIR}/toolchain.env"
TEST_CMD="cargo test"
LINT_CMD="cargo clippy"
BUILD_CMD="cargo build"
EOF
        if [ ! -f "${ROOT_DIR}/Cargo.toml" ]; then
            cat <<EOF > "${ROOT_DIR}/Cargo.toml"
[package]
name = "${NAME}"
version = "0.1.0"
edition = "2021"

[dependencies]
EOF
            mkdir -p "${ROOT_DIR}/src"
            cat <<EOF > "${ROOT_DIR}/src/lib.rs"
#[cfg(test)]
mod tests {
    #[test]
    fn smoke_test() {
        assert_eq!(2 + 2, 4);
    }
}
EOF
        fi
        ;;
    *)
        echo "⚠️  Stack '${STACK}' recognized as generic."
        ;;
esac

# Arm Git pre-commit hook if .git exists
if [ -d "${ROOT_DIR}/.git" ]; then
    mkdir -p "${ROOT_DIR}/.git/hooks"
    cp "${ROOT_DIR}/scripts/pre-commit-hook.sh" "${ROOT_DIR}/.git/hooks/pre-commit"
    chmod +x "${ROOT_DIR}/.git/hooks/pre-commit"
    echo "🛡️  Pre-commit secret quarantine hook installed."
fi

# Update state
cat <<EOF > "${ROOT_DIR}/.agents/state/current-milestone.md"
# Current Milestone: Initial MVP for ${NAME}
- **Stack**: ${STACK}
- **Phase**: Ready for feature specification.
EOF

echo "✨ Project '${NAME}' initialized successfully! Run 'scripts/verify.sh check-all' to verify."
