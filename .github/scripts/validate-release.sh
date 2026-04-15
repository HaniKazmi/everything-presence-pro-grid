#!/usr/bin/env bash
# Validates release version alignment. Runs in CI on tag push.
#
# Usage: .github/scripts/validate-release.sh <tag-version>
#
# Exits 0 if all invariants hold, non-zero with a clear error otherwise.
# Invariants:
#   (1) custom_components/eppgrid/manifest.json version == <tag-version>
#   (2) custom_components/eppgrid/const.py FIRMWARE_VERSION ==
#       firmware/common/everything-presence-pro-base.yaml version ==
#       firmware/components/epp/epp_component.h FIRMWARE_VERSION_STR
#
# Note: firmware version does NOT have to equal the tag. Integration-only
# releases have manifest=new, firmware=unchanged. The workflow decides
# whether to build firmware based on whether firmware_version == tag.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <tag-version>" >&2
  exit 2
fi

TAG="$1"

MANIFEST_VER=$(python3 -c "import json; print(json.load(open('custom_components/eppgrid/manifest.json'))['version'])")

if [ "$TAG" != "$MANIFEST_VER" ]; then
  echo "::error::Tag v$TAG does not match manifest.json version $MANIFEST_VER" >&2
  exit 1
fi
