#!/usr/bin/env bash
# Prepares a release PR: bumps version files and opens a PR.
#
# Usage: bin/release.sh <version>
#
# Example: bin/release.sh 0.93.0
#          bin/release.sh 0.93.0-alpha.1
#
# After the PR merges, push the v<version> tag to trigger the firmware
# release workflow.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <version>" >&2
  exit 2
fi

VERSION="$1"

SEMVER_RE='^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)\.[0-9]+)?$'
if ! [[ "$VERSION" =~ $SEMVER_RE ]]; then
  echo "error: not a valid semver version: $VERSION" >&2
  echo "expected format: MAJOR.MINOR.PATCH or MAJOR.MINOR.PATCH-(alpha|beta|rc).N" >&2
  exit 1
fi

# Must be on main.
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "error: must be on main (currently on $CURRENT_BRANCH)" >&2
  exit 1
fi

# Working tree must be clean.
if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is not clean; commit or stash first" >&2
  exit 1
fi

# Tag must not exist locally or on origin.
TAG="v$VERSION"
if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "error: tag $TAG already exists locally" >&2
  exit 1
fi
if git ls-remote --tags origin 2>/dev/null | grep -q "refs/tags/$TAG$"; then
  echo "error: tag $TAG already exists on origin" >&2
  exit 1
fi
