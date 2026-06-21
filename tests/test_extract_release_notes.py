"""`.github/scripts/extract-release-notes.sh` — pull one version's section out
of CHANGES.md for use as the GitHub release body.

The firmware-release workflow uses this so a release's notes are the curated,
user-facing changelog entry rather than an auto-generated commit list. A tag
with no matching changelog section (e.g. a pre-release) exits non-zero so the
workflow can fall back to GitHub's generated notes.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / ".github" / "scripts" / "extract-release-notes.sh"

SAMPLE = """\
# Changelog

Intro line that must never appear in any release body.

## v1.2.1 — 2026-06-21

### Fixes

- Multi-device updates are reliable.

## v1.2.0 — 2026-06-21

### New features

- Device Groups editor redesigned.

## v1.1.0 — 2026-06-14

### New features

- Device Groups.
"""


def _run(version: str, changes_text: str, tmp_path: Path) -> subprocess.CompletedProcess[str]:
    changes = tmp_path / "CHANGES.md"
    changes.write_text(changes_text)
    return subprocess.run(
        [str(SCRIPT), version],
        capture_output=True,
        text=True,
        env={"CHANGES_FILE": str(changes), "PATH": "/usr/bin:/bin"},
    )


def test_extracts_the_requested_version_section(tmp_path: Path) -> None:
    result = _run("1.2.1", SAMPLE, tmp_path)
    assert result.returncode == 0
    assert "Multi-device updates are reliable." in result.stdout
    assert "### Fixes" in result.stdout


def test_section_stops_before_the_next_version(tmp_path: Path) -> None:
    """Extracting 1.2.0 must not bleed into the 1.1.0 section below it."""
    result = _run("1.2.0", SAMPLE, tmp_path)
    assert result.returncode == 0
    assert "Device Groups editor redesigned." in result.stdout
    assert "v1.1.0" not in result.stdout
    assert "Device Groups." not in result.stdout


def test_excludes_the_file_header_and_version_heading(tmp_path: Path) -> None:
    """The body is the section content only — not the changelog preamble nor the
    `## v…` heading itself (the GitHub release title already carries the tag)."""
    result = _run("1.2.1", SAMPLE, tmp_path)
    assert "Intro line that must never appear" not in result.stdout
    assert not result.stdout.lstrip().startswith("## v1.2.1")


def test_missing_version_exits_nonzero_with_no_output(tmp_path: Path) -> None:
    result = _run("9.9.9", SAMPLE, tmp_path)
    assert result.returncode != 0
    assert result.stdout.strip() == ""


def test_prefix_version_does_not_match_a_longer_one(tmp_path: Path) -> None:
    """`1.2` must not match the `1.2.1` heading (substring-prefix trap)."""
    result = _run("1.2", SAMPLE, tmp_path)
    assert result.returncode != 0


def test_real_changelog_v1_2_1_section(tmp_path: Path) -> None:
    """Smoke test against the committed CHANGES.md so the script and the real
    file stay compatible."""
    text = (REPO_ROOT / "CHANGES.md").read_text()
    result = _run("1.2.1", text, tmp_path)
    assert result.returncode == 0
    assert "Updating several devices at once" in result.stdout
    assert "v1.2.0" not in result.stdout
