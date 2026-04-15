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
        f'esphome:\n  project:\n    version: "{firmware_version}"\n'
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


def test_fails_when_firmware_versions_disagree(tmp_path: Path):
    """const.py says 0.92.0 but base.yaml says 0.91.0 — misalignment."""
    fixture = _make_fixture(tmp_path, manifest_version="0.93.0", firmware_version="0.92.0")

    base_yaml = fixture / "firmware" / "common" / "everything-presence-pro-base.yaml"
    base_yaml.write_text(
        'esphome:\n  project:\n    version: "0.91.0"\n'
    )

    result = _run(fixture, "0.93.0")

    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "firmware" in combined.lower()
    assert "0.91.0" in combined
    assert "0.92.0" in combined


def test_passes_when_firmware_matches_tag(tmp_path: Path):
    """Firmware-changing release: manifest = firmware = tag."""
    fixture = _make_fixture(tmp_path, manifest_version="0.93.0", firmware_version="0.93.0")

    result = _run(fixture, "0.93.0")

    assert result.returncode == 0


def test_passes_when_firmware_older_than_tag(tmp_path: Path):
    """Integration-only release: manifest = tag, firmware = older (aligned across the three firmware files)."""
    fixture = _make_fixture(tmp_path, manifest_version="0.93.1", firmware_version="0.92.0")

    result = _run(fixture, "0.93.1")

    assert result.returncode == 0


def test_fails_when_const_py_has_no_firmware_version_line(tmp_path: Path):
    """Script must not silently pass when extraction returns empty.

    Corrupts all three firmware files so all three extractions return ''.
    Without the empty-string guards, '' == '' == '' and the script exits 0
    silently — the critical bug.
    """
    fixture = _make_fixture(tmp_path, manifest_version="0.93.0", firmware_version="0.92.0")

    # Corrupt const.py so the FIRMWARE_VERSION regex won't match
    (fixture / "custom_components" / "eppgrid" / "const.py").write_text(
        "# no firmware version here\n"
    )
    # Corrupt the other two so all three return '' and trigger the silent-pass bug
    (fixture / "firmware" / "common" / "everything-presence-pro-base.yaml").write_text(
        "# no version here\n"
    )
    (fixture / "firmware" / "components" / "epp" / "epp_component.h").write_text(
        "// no version here\n"
    )

    result = _run(fixture, "0.93.0")

    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "const.py" in combined or "FIRMWARE_VERSION" in combined
