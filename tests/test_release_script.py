"""Tests for bin/release.sh."""

import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "bin" / "release.sh"


def _run(cwd: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["bash", str(SCRIPT), *args],
        cwd=cwd,
        capture_output=True,
        text=True,
    )


def test_rejects_invalid_semver(tmp_path: Path):
    result = _run(tmp_path, "not-a-version")
    assert result.returncode != 0
    assert "semver" in (result.stdout + result.stderr).lower()


def test_accepts_alpha_suffix(tmp_path: Path):
    """Pre-flight should accept alpha pre-release suffix at the semver check.
    Other pre-flights (clean tree, on main, etc.) will still fail in tmp_path,
    so we only check that the error is NOT a semver error."""
    result = _run(tmp_path, "0.93.0-alpha.1")
    combined = (result.stdout + result.stderr).lower()
    assert "semver" not in combined


def test_accepts_beta_suffix(tmp_path: Path):
    result = _run(tmp_path, "0.93.0-beta.2")
    combined = (result.stdout + result.stderr).lower()
    assert "semver" not in combined


def test_accepts_rc_suffix(tmp_path: Path):
    result = _run(tmp_path, "0.93.0-rc.1")
    combined = (result.stdout + result.stderr).lower()
    assert "semver" not in combined


def _init_repo(tmp_path: Path, *, branch: str = "main", dirty: bool = False) -> Path:
    """Create a tiny git repo with version files on the named branch."""
    subprocess.run(["git", "init", "-q", "-b", branch], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.email", "t@test"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.name", "t"], cwd=tmp_path, check=True)

    (tmp_path / "custom_components" / "eppgrid").mkdir(parents=True)
    (tmp_path / "custom_components" / "eppgrid" / "manifest.json").write_text(
        '{"domain":"eppgrid","version":"0.92.0"}\n'
    )
    (tmp_path / "custom_components" / "eppgrid" / "const.py").write_text(
        'FIRMWARE_VERSION = "0.92.0"\n'
    )
    (tmp_path / "firmware" / "common").mkdir(parents=True)
    (tmp_path / "firmware" / "common" / "everything-presence-pro-base.yaml").write_text(
        'substitutions:\n  project:\n    version: "0.92.0"\n'
    )
    (tmp_path / "firmware" / "components" / "epp").mkdir(parents=True)
    (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").write_text(
        '  static constexpr const char* FIRMWARE_VERSION_STR = "0.92.0";\n'
    )
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-qm", "init"], cwd=tmp_path, check=True)
    subprocess.run(["git", "tag", "v0.92.0"], cwd=tmp_path, check=True)

    if dirty:
        (tmp_path / "dirt").write_text("x")

    return tmp_path


def test_rejects_non_main_branch(tmp_path: Path):
    _init_repo(tmp_path, branch="feature")
    result = _run(tmp_path, "0.93.0")
    assert result.returncode != 0
    assert "main" in (result.stdout + result.stderr).lower()


def test_rejects_dirty_tree(tmp_path: Path):
    _init_repo(tmp_path, dirty=True)
    result = _run(tmp_path, "0.93.0")
    assert result.returncode != 0
    combined = (result.stdout + result.stderr).lower()
    assert "clean" in combined or "dirty" in combined or "uncommitted" in combined


def test_rejects_existing_tag(tmp_path: Path):
    _init_repo(tmp_path)
    result = _run(tmp_path, "0.92.0")  # tag v0.92.0 already exists
    assert result.returncode != 0
    assert "tag" in (result.stdout + result.stderr).lower()


def test_rejects_main_behind_origin(tmp_path: Path):
    """If local main has fewer commits than origin/main, fail."""
    # Create a bare "origin" and a local clone.
    origin = tmp_path / "origin.git"
    subprocess.run(["git", "init", "-q", "--bare", "-b", "main", str(origin)], check=True)

    local = tmp_path / "local"
    local.mkdir()
    _init_repo(local)
    subprocess.run(["git", "remote", "add", "origin", str(origin)], cwd=local, check=True)
    subprocess.run(["git", "push", "-q", "origin", "main", "--tags"], cwd=local, check=True)

    # Add a commit on origin that local doesn't have.
    other = tmp_path / "other"
    subprocess.run(["git", "clone", "-q", str(origin), str(other)], check=True)
    subprocess.run(["git", "config", "user.email", "t@test"], cwd=other, check=True)
    subprocess.run(["git", "config", "user.name", "t"], cwd=other, check=True)
    (other / "new.txt").write_text("x")
    subprocess.run(["git", "add", "."], cwd=other, check=True)
    subprocess.run(["git", "commit", "-qm", "new"], cwd=other, check=True)
    subprocess.run(["git", "push", "-q", "origin", "main"], cwd=other, check=True)

    result = _run(local, "0.93.0")
    assert result.returncode != 0
    combined = (result.stdout + result.stderr).lower()
    assert "up to date" in combined or "behind" in combined


def test_integration_only_release_bumps_manifest_only(tmp_path: Path):
    _init_repo(tmp_path)
    result = _run(tmp_path, "0.93.0", "--no-push")
    assert result.returncode == 0, result.stdout + result.stderr

    # Branch exists
    branches = subprocess.check_output(
        ["git", "branch", "--list", "release-v0.93.0"], cwd=tmp_path, text=True
    )
    assert "release-v0.93.0" in branches

    # Switch to that branch and inspect
    subprocess.run(["git", "checkout", "-q", "release-v0.93.0"], cwd=tmp_path, check=True)

    manifest = (tmp_path / "custom_components" / "eppgrid" / "manifest.json").read_text()
    assert '"version": "0.93.0"' in manifest

    # Firmware files UNCHANGED (integration-only release)
    const_py = (tmp_path / "custom_components" / "eppgrid" / "const.py").read_text()
    assert 'FIRMWARE_VERSION = "0.92.0"' in const_py

    base_yaml = (tmp_path / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()
    assert 'version: "0.92.0"' in base_yaml

    header = (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").read_text()
    assert 'FIRMWARE_VERSION_STR = "0.92.0"' in header


def test_firmware_release_bumps_all_four_versions(tmp_path: Path):
    _init_repo(tmp_path)

    # Simulate firmware code change since last tag by editing a firmware file
    # (not a version field — we're simulating real firmware code churn).
    hw_pins = tmp_path / "firmware" / "common" / "hardware.yaml"
    hw_pins.write_text("# fake firmware code change\n")
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-qm", "firmware: add hardware.yaml"], cwd=tmp_path, check=True)

    result = _run(tmp_path, "0.93.0", "--no-push")
    assert result.returncode == 0, result.stdout + result.stderr

    subprocess.run(["git", "checkout", "-q", "release-v0.93.0"], cwd=tmp_path, check=True)

    manifest = (tmp_path / "custom_components" / "eppgrid" / "manifest.json").read_text()
    assert '"version": "0.93.0"' in manifest

    const_py = (tmp_path / "custom_components" / "eppgrid" / "const.py").read_text()
    assert 'FIRMWARE_VERSION = "0.93.0"' in const_py

    base_yaml = (tmp_path / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()
    assert 'version: "0.93.0"' in base_yaml

    header = (tmp_path / "firmware" / "components" / "epp" / "epp_component.h").read_text()
    assert 'FIRMWARE_VERSION_STR = "0.93.0"' in header
