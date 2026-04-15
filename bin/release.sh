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

if [ $# -lt 1 ]; then
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

# Local main must be up to date with origin/main.
if git remote get-url origin >/dev/null 2>&1; then
  git fetch -q origin main
  LOCAL=$(git rev-parse main)
  REMOTE=$(git rev-parse origin/main)
  if [ "$LOCAL" != "$REMOTE" ]; then
    echo "error: local main is not up to date with origin/main" >&2
    echo "  local:  $LOCAL" >&2
    echo "  origin: $REMOTE" >&2
    exit 1
  fi
fi

# Optional --no-push flag for tests.
NO_PUSH=false
if [ "${2:-}" = "--no-push" ]; then
  NO_PUSH=true
fi

# Detect firmware changes since last tag.
PREV_TAG=$(git describe --tags --abbrev=0)
FIRMWARE_DIFF=$(git diff "$PREV_TAG..HEAD" -- firmware/ || true)
if [ -n "$FIRMWARE_DIFF" ]; then
  FIRMWARE_CHANGED=true
else
  FIRMWARE_CHANGED=false
fi

BRANCH="release-$TAG"
git checkout -q -b "$BRANCH"

# Always bump manifest.json.
python3 - <<PY
import json, pathlib
p = pathlib.Path("custom_components/eppgrid/manifest.json")
data = json.loads(p.read_text())
data["version"] = "$VERSION"
p.write_text(json.dumps(data, indent=2) + "\n")
PY

# Verify edit landed.
grep -q "\"version\": \"$VERSION\"" custom_components/eppgrid/manifest.json

if [ "$FIRMWARE_CHANGED" = "true" ]; then
  # Bump FIRMWARE_VERSION in const.py.
  sed -i.bak "s/^FIRMWARE_VERSION = \".*\"/FIRMWARE_VERSION = \"$VERSION\"/" custom_components/eppgrid/const.py
  rm -f custom_components/eppgrid/const.py.bak
  grep -q "^FIRMWARE_VERSION = \"$VERSION\"" custom_components/eppgrid/const.py

  # Bump version in firmware base YAML.
  sed -i.bak "s/^    version: \".*\"/    version: \"$VERSION\"/" firmware/common/everything-presence-pro-base.yaml
  rm -f firmware/common/everything-presence-pro-base.yaml.bak
  grep -q "^    version: \"$VERSION\"" firmware/common/everything-presence-pro-base.yaml

  # Bump FIRMWARE_VERSION_STR in C++ header.
  sed -i.bak "s/FIRMWARE_VERSION_STR = \".*\"/FIRMWARE_VERSION_STR = \"$VERSION\"/" firmware/components/epp/epp_component.h
  rm -f firmware/components/epp/epp_component.h.bak
  grep -q "FIRMWARE_VERSION_STR = \"$VERSION\"" firmware/components/epp/epp_component.h
fi

git add -A
git commit -qm "chore: release $TAG

$(if [ "$FIRMWARE_CHANGED" = "true" ]; then echo "Firmware-changing release: bumped firmware versions to $VERSION."; else echo "Integration-only release: firmware version unchanged."; fi)"

if [ "$NO_PUSH" = "true" ]; then
  echo "Branch $BRANCH prepared. --no-push given; skipping push and PR creation."
  exit 0
fi

# Push + open PR — implemented in Task 21.
echo "error: push/PR creation not yet implemented" >&2
exit 1
