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
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null) || {
  echo "error: no tags found; cannot determine previous release for firmware-change detection" >&2
  exit 1
}
FIRMWARE_DIFF=$(git diff "$PREV_TAG..HEAD" -- firmware/ || true)
if [ -n "$FIRMWARE_DIFF" ]; then
  FIRMWARE_CHANGED=true
else
  FIRMWARE_CHANGED=false
fi

BRANCH="release-$TAG"
git checkout -q -b "$BRANCH"

# Always bump manifest.json version.
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" custom_components/eppgrid/manifest.json
rm -f custom_components/eppgrid/manifest.json.bak
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

  # epp_component.h derives FIRMWARE_VERSION_STR from the ESPHOME_PROJECT_VERSION
  # macro (ESPHome populates it from esphome.project.version at compile time),
  # so there is no hardcoded version literal in the header to bump.
fi

git add -A
# --allow-empty supports the "version bumped in an earlier feature commit"
# workflow: when manifest/const/yaml are already at $VERSION on main, the
# release branch still gets a clear `chore: release v$VERSION` marker commit.
git commit --allow-empty -qm "chore: release $TAG

$(if [ "$FIRMWARE_CHANGED" = "true" ]; then echo "Firmware-changing release: bumped firmware versions to $VERSION."; else echo "Integration-only release: firmware version unchanged."; fi)"

if [ "$NO_PUSH" = "true" ]; then
  echo "Branch $BRANCH prepared. --no-push given; skipping push and PR creation."
  exit 0
fi

# Push the release branch.
git push -u origin "$BRANCH"

# Open the PR.
if [ "$FIRMWARE_CHANGED" = "true" ]; then
  BODY="Firmware-changing release: firmware version bumped to \`$VERSION\`."
else
  BODY="Integration-only release: firmware version unchanged at \`$PREV_TAG\`."
fi

gh pr create \
  --title "chore: release $TAG" \
  --body "$BODY

After merge, push the tag to trigger the firmware-release workflow:

\`\`\`
git tag $TAG
git push origin $TAG
\`\`\`
"

echo "Release $TAG branch pushed and PR opened."
