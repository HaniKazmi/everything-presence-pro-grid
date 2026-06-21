#!/usr/bin/env bash
# Print the CHANGES.md section for a given version, for use as a GitHub release
# body. The firmware-release workflow uses this so a release's notes are the
# curated, user-facing changelog entry instead of an auto-generated commit list.
#
# Usage: extract-release-notes.sh <version>      e.g. 1.2.1
#        CHANGES_FILE=path/to/CHANGES.md extract-release-notes.sh <version>
#
# Prints the section body (heading and surrounding blank lines stripped) and
# exits 0 when the version has a `## v<version> …` section. Exits 1 with no
# output when it doesn't (e.g. a pre-release tag with no changelog entry), so
# the caller can fall back to GitHub's generated notes.

set -euo pipefail

VERSION="${1:?usage: $0 <version>}"
CHANGES="${CHANGES_FILE:-CHANGES.md}"

if [ ! -f "$CHANGES" ]; then
  echo "error: changelog not found: $CHANGES" >&2
  exit 2
fi

# Escape regex metacharacters in the version so dots match literally (so
# `1.2.1` can't match `1x2x1`). A trailing `([^0-9.]|$)` boundary stops a
# shorter version from matching a longer heading (`1.2` vs `1.2.1`, `1.2.1`
# vs `1.2.10`).
ver_re="$(printf '%s' "$VERSION" | sed 's/[.[\*^$]/\\&/g')"

section="$(
  awk -v ver_re="$ver_re" '
    $0 ~ "^## v" ver_re "([^0-9.]|$)" { found = 1; next }   # our heading: start, drop it
    found && /^## / { exit }                                # next version heading: stop
    found { print }
  ' "$CHANGES"
)"

# Strip leading blank lines (the blank after the heading). Command
# substitution already trims trailing newlines, so the blank before the next
# heading is gone too.
section="$(printf '%s\n' "$section" | sed -e '/./,$!d')"

if [ -z "$section" ]; then
  exit 1
fi

printf '%s\n' "$section"
