"""Tests for .github/scripts/validate-release.sh."""

import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / ".github" / "scripts" / "validate-release.sh"


def _make_fixture(tmp_path: Path, *, manifest_version: str, firmware_version: str) -> Path:
    """Create a minimal repo structure with given version strings."""
    (tmp_path / "custom_components" / "eppgrid").mkdir(parents=True)
    (tmp_path / "custom_components" / "eppgrid" / "manifest.json").write_text(
        f'{{"domain": "eppgrid", "version": "{manifest_version}"}}\n'
    )
    (tmp_path / "custom_components" / "eppgrid" / "const.py").write_text(
        f'FIRMWARE_VERSION = "{firmware_version}"\n'
    )
    (tmp_path / "firmware" / "common").mkdir(parents=True)
    (tmp_path / "firmware" / "common" / "everything-presence-pro-base.yaml").write_text(
        f'substitutions:\n  project:\n    version: "{firmware_version}"\n'
    )
    (tmp_path / "firmware" / "components" / "epp").mkdir(parents=True)
    (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").write_text(
        f'  static constexpr const char* FIRMWARE_VERSION_STR = "{firmware_version}";\n'
    )
    return tmp_path


def _run(fixture: Path, tag: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SCRIPT), tag],
        cwd=fixture,
        capture_output=True,
        text=True,
    )


def test_fails_when_manifest_version_does_not_match_tag(tmp_path: Path):
    fixture = _make_fixture(tmp_path, manifest_version="0.93.0", firmware_version="0.92.0")

    result = _run(fixture, "0.99.0")

    assert result.returncode != 0
    assert "manifest.json" in (result.stdout + result.stderr)
    assert "0.93.0" in (result.stdout + result.stderr)
    assert "0.99.0" in (result.stdout + result.stderr)
