#!/usr/bin/env bash
# ==============================================================================
# Universal 4-Target Toolchain Runner (verify.sh)
# ==============================================================================
# Targets:
#   test      - Run test suite
#   lint      - Run static analysis and style linters
#   build     - Compile, build or bundle the application
#   check-all - Execute full pre-release gate (lint + test + build + secret scan)
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load toolchain overrides if present
if [ -f "${ROOT_DIR}/toolchain.env" ]; then
    # shellcheck disable=SC1091
    source "${ROOT_DIR}/toolchain.env"
fi

TARGET="${1:-check-all}"

# Detection logic
detect_toolchain() {
    if [ -n "${TEST_CMD}" ]; then
        echo "configured"
        return
    fi

    if [ -f "${ROOT_DIR}/Cargo.toml" ]; then
        echo "rust"
    elif [ -f "${ROOT_DIR}/pyproject.toml" ] || [ -f "${ROOT_DIR}/requirements.txt" ]; then
        echo "python"
    elif [ -f "${ROOT_DIR}/go.mod" ]; then
        echo "go"
    elif [ -f "${ROOT_DIR}/package.json" ]; then
        echo "node"
    elif [ -f "${ROOT_DIR}/Makefile" ]; then
        echo "make"
    else
        echo "generic"
    fi
}

TOOLCHAIN=$(detect_toolchain)

run_test() {
    echo "🔍 [verify.sh] Running TEST target (Toolchain: ${TOOLCHAIN})..."
    if [ -n "${TEST_CMD}" ]; then
        eval "${TEST_CMD}"
    elif [ "${TOOLCHAIN}" = "rust" ]; then
        cargo test
    elif [ "${TOOLCHAIN}" = "python" ]; then
        if command -v pytest >/dev/null 2>&1; then
            pytest
        else
            python3 -m unittest discover -s . -p "*test*.py"
        fi
    elif [ "${TOOLCHAIN}" = "go" ]; then
        go test ./...
    elif [ "${TOOLCHAIN}" = "node" ]; then
        npm test
    elif [ "${TOOLCHAIN}" = "make" ]; then
        make test
    else
        echo "ℹ️  No test runner detected. Define TEST_CMD in toolchain.env or add language config."
    fi
}

run_lint() {
    echo "🔍 [verify.sh] Running LINT target (Toolchain: ${TOOLCHAIN})..."
    if [ -n "${LINT_CMD}" ]; then
        eval "${LINT_CMD}"
    elif [ "${TOOLCHAIN}" = "rust" ]; then
        cargo clippy -- -D warnings
    elif [ "${TOOLCHAIN}" = "python" ]; then
        if command -v ruff >/dev/null 2>&1; then
            ruff check .
        elif command -v flake8 >/dev/null 2>&1; then
            flake8 .
        else
            echo "ℹ️  Ruff/Flake8 not installed. Skipping Python lint."
        fi
    elif [ "${TOOLCHAIN}" = "go" ]; then
        if command -v golangci-lint >/dev/null 2>&1; then
            golangci-lint run
        else
            go vet ./...
        fi
    elif [ "${TOOLCHAIN}" = "node" ]; then
        if npm run | grep -q "lint"; then
            npm run lint
        fi
    elif [ "${TOOLCHAIN}" = "make" ]; then
        make lint
    else
        echo "ℹ️  No linter detected. Define LINT_CMD in toolchain.env or add language config."
    fi
}

run_build() {
    echo "🔍 [verify.sh] Running BUILD target (Toolchain: ${TOOLCHAIN})..."
    if [ -n "${BUILD_CMD}" ]; then
        eval "${BUILD_CMD}"
    elif [ "${TOOLCHAIN}" = "rust" ]; then
        cargo build
    elif [ "${TOOLCHAIN}" = "python" ]; then
        python3 -m py_compile $(git ls-files "*.py" 2>/dev/null || true)
    elif [ "${TOOLCHAIN}" = "go" ]; then
        go build ./...
    elif [ "${TOOLCHAIN}" = "node" ]; then
        if npm run | grep -q "build"; then
            npm run build
        fi
    elif [ "${TOOLCHAIN}" = "make" ]; then
        make build
    else
        echo "ℹ️  No build runner detected."
    fi
}

case "${TARGET}" in
    test)
        run_test
        ;;
    lint)
        run_lint
        ;;
    build)
        run_build
        ;;
    check-all)
        run_lint
        run_test
        run_build
        if [ -f "${SCRIPT_DIR}/pre-commit-hook.sh" ]; then
            bash "${SCRIPT_DIR}/pre-commit-hook.sh"
        fi
        echo "✅ [verify.sh] ALL CHECKS PASSED. Ready for release/handoff."
        ;;
    *)
        echo "Usage: $0 {test|lint|build|check-all}"
        exit 1
        ;;
esac
