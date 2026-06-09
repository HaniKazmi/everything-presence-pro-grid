#!/usr/bin/env bash
# Promotes a pre-release to the latest full release.
#
# Usage: bin/promote.sh <version>
#
# Example: bin/promote.sh 1.0.4
#
# firmware-release.yml publishes EVERY release as a pre-release (never the
# GitHub "latest"). Once you've tested the firmware/integration, run this to
# flip the release to a full, latest release — which also re-fires pages.yml
# to stage fw/latest/ from it. Idempotent: re-running on an already-promoted
# release is a no-op.

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

TAG="v$VERSION"

# Confirm the release exists and learn its current state. Capture stderr (via
# 2>&1) so a gh failure surfaces its real cause instead of being silently
# misattributed to a missing release — the error could equally be auth,
# network, rate-limiting, or running outside the repo. On success gh writes
# only the bool to stdout, so VIEW holds "true"/"false".
if ! VIEW=$(gh release view "$TAG" --json isPrerelease --jq '.isPrerelease' 2>&1); then
  echo "error: could not read GitHub release $TAG:" >&2
  printf '  %s\n' "$VIEW" >&2
  echo "  (if it doesn't exist, has the tag been pushed and the firmware-release workflow finished?)" >&2
  exit 1
fi
PRERELEASE="$VIEW"

if [ "$PRERELEASE" != "true" ]; then
  echo "$TAG is already a full release; nothing to do."
  exit 0
fi

gh release edit "$TAG" --prerelease=false --latest=true
echo "Promoted $TAG to the latest full release."
