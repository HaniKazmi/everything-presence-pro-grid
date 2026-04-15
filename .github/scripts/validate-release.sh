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

# Three-way firmware-version alignment.
CONST_FW=$(python3 -c "
import re
text = open('custom_components/eppgrid/const.py').read()
m = re.search(r'^FIRMWARE_VERSION\s*=\s*\"([^\"]+)\"', text, re.M)
print(m.group(1) if m else '')
")
if [ -z "$CONST_FW" ]; then
  echo "::error::Could not extract FIRMWARE_VERSION from custom_components/eppgrid/const.py" >&2
  exit 1
fi

YAML_FW=$(python3 -c "
import re
text = open('firmware/common/everything-presence-pro-base.yaml').read()
m = re.search(r'^ {4}version:\s*\"([^\"]+)\"', text, re.M)
print(m.group(1) if m else '')
")
if [ -z "$YAML_FW" ]; then
  echo "::error::Could not extract version from firmware/common/everything-presence-pro-base.yaml" >&2
  exit 1
fi

HEADER_FW=$(python3 -c "
import re
text = open('firmware/components/epp/epp_component.h').read()
m = re.search(r'FIRMWARE_VERSION_STR\s*=\s*\"([^\"]+)\"', text)
print(m.group(1) if m else '')
")
if [ -z "$HEADER_FW" ]; then
  echo "::error::Could not extract FIRMWARE_VERSION_STR from firmware/components/epp/epp_component.h" >&2
  exit 1
fi

if [ "$CONST_FW" != "$YAML_FW" ] || [ "$CONST_FW" != "$HEADER_FW" ]; then
  echo "::error::Firmware versions disagree:" >&2
  echo "  const.py FIRMWARE_VERSION = $CONST_FW" >&2
  echo "  base.yaml version = $YAML_FW" >&2
  echo "  epp_component.h FIRMWARE_VERSION_STR = $HEADER_FW" >&2
  exit 1
fi
