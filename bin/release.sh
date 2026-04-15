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
