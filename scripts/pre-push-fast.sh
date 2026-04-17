#!/usr/bin/env bash
# Fast pre-push check — run before `git push` to catch the common formatting /
# lint failures that would otherwise kick in during the full pre-push hook
# (which runs the same checks plus tests + coverage + C++ build, ~6 min total).
#
# Takes ~5 seconds. If this passes, the full hook's format/lint steps will too.
#
# Usage:
#   ./scripts/pre-push-fast.sh

set -e

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

printf '▶ ruff format\n'
if ! ruff format --check custom_components/ tests/ firmware/; then
    printf '\n✗ Python formatting — run: ruff format custom_components/ tests/ firmware/\n'
    exit 1
fi

printf '\n▶ ruff check\n'
if ! ruff check custom_components/ tests/ firmware/; then
    printf '\n✗ Python lint — run: ruff check --fix custom_components/ tests/ firmware/\n'
    exit 1
fi

printf '\n▶ biome check\n'
if ! (cd frontend && npx biome check src/); then
    printf '\n✗ TypeScript format/lint — run: cd frontend && npx biome check --fix src/\n'
    exit 1
fi

printf '\n✓ fast checks pass — safe to run git push\n'
