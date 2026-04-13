"""Tests for scripts/check_translations.py."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import check_translations as ct  # noqa: E402


def write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj))


def test_flatten_keys_returns_dotted_paths_for_nested_dict() -> None:
    obj = {"a": {"b": "1", "c": {"d": "2"}}, "e": "3"}
    assert ct.flatten_keys(obj) == {"a.b", "a.c.d", "e"}


def test_flatten_keys_empty_dict_returns_empty_set() -> None:
    assert ct.flatten_keys({}) == set()


def test_check_python_passes_when_strings_and_en_match(tmp_path: Path) -> None:
    comp = tmp_path / "custom_components" / "eppgrid"
    write_json(comp / "strings.json", {"config": {"step": {"user": {"title": "X"}}}})
    write_json(comp / "translations" / "en.json", {"config": {"step": {"user": {"title": "X"}}}})

    errors = ct.check_python_translations(comp)

    assert errors == []


def test_check_python_fails_when_strings_diverge_from_en(tmp_path: Path) -> None:
    comp = tmp_path / "custom_components" / "eppgrid"
    write_json(comp / "strings.json", {"config": {"step": {"user": {"title": "X"}}}})
    write_json(comp / "translations" / "en.json", {"config": {"step": {"user": {"title": "Y"}}}})

    errors = ct.check_python_translations(comp)

    assert any("strings.json" in e and "en.json" in e for e in errors)


def test_check_python_fails_when_extra_locale_missing_keys(tmp_path: Path) -> None:
    comp = tmp_path / "custom_components" / "eppgrid"
    write_json(comp / "strings.json", {"a": "X", "b": "Y"})
    write_json(comp / "translations" / "en.json", {"a": "X", "b": "Y"})
    write_json(comp / "translations" / "de.json", {"a": "X"})  # missing "b"

    errors = ct.check_python_translations(comp)

    assert any("de.json" in e and "b" in e for e in errors)


def test_check_python_fails_when_extra_locale_has_extra_keys(tmp_path: Path) -> None:
    comp = tmp_path / "custom_components" / "eppgrid"
    write_json(comp / "strings.json", {"a": "X"})
    write_json(comp / "translations" / "en.json", {"a": "X"})
    write_json(comp / "translations" / "de.json", {"a": "X", "extra": "Z"})

    errors = ct.check_python_translations(comp)

    assert any("de.json" in e and "extra" in e for e in errors)


def test_extract_referenced_keys_finds_localize_calls(tmp_path: Path) -> None:
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.ts").write_text('const x = localize("foo.bar");\nlocalize("baz.qux", { n: 1 });\n')

    keys = ct.extract_referenced_keys(src, {"foo.bar", "baz.qux", "unused.key"})

    assert "foo.bar" in keys
    assert "baz.qux" in keys


def test_extract_referenced_keys_finds_keys_passed_via_data(tmp_path: Path) -> None:
    """Keys built dynamically via data (e.g. label: 'furniture.sofa') count as referenced."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "data.ts").write_text('const stickers = [{ label: "furniture.sofa" }];\n')

    keys = ct.extract_referenced_keys(src, {"furniture.sofa", "furniture.unused"})

    assert "furniture.sofa" in keys
    assert "furniture.unused" not in keys


def test_extract_referenced_keys_finds_template_literal_prefix(tmp_path: Path) -> None:
    """Keys built dynamically via template literals (e.g. `prefix.${var}`) count
    as referenced for any en.json key sharing that prefix."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "settings.ts").write_text("const level = 'debug';\nlocalize(`settings.log_level.${level.toLowerCase()}`);\n")

    keys = ct.extract_referenced_keys(src, {"settings.log_level.debug", "settings.log_level.info", "other.unrelated"})

    assert "settings.log_level.debug" in keys
    assert "settings.log_level.info" in keys
    assert "other.unrelated" not in keys


def test_extract_referenced_keys_finds_python_string_references(tmp_path: Path) -> None:
    """Keys may be referenced from Python (e.g. error_key='flasher.errors.x' in a
    websocket response). The orphan check must include these references."""
    src = tmp_path / "src"
    write_json(src / "translations" / "en.json", {"flasher": {"errors": {"foo": "Foo"}}})
    py = tmp_path / "custom_components" / "eppgrid"
    py.mkdir(parents=True)
    (py / "websocket_api.py").write_text('_send({"error_key": "flasher.errors.foo"})\n')

    errors, _ = ct.check_typescript_translations(src, extra_source_dirs=[py])

    assert not any("flasher.errors.foo" in e for e in errors)


def test_extract_referenced_keys_skips_test_files(tmp_path: Path) -> None:
    src = tmp_path / "src"
    (src / "__tests__").mkdir(parents=True)
    (src / "__tests__" / "x.test.ts").write_text('localize("only.in.tests");\n')

    keys = ct.extract_referenced_keys(src, {"only.in.tests"})

    assert "only.in.tests" not in keys


def test_check_typescript_passes_when_all_keys_match(tmp_path: Path) -> None:
    src = tmp_path / "src"
    write_json(src / "translations" / "en.json", {"common": {"save": "Save"}})
    (src / "app.ts").write_text('localize("common.save");\n')

    errors, warnings = ct.check_typescript_translations(src)

    assert errors == []
    assert warnings == []


def test_check_typescript_fails_on_missing_localize_key(tmp_path: Path) -> None:
    src = tmp_path / "src"
    write_json(src / "translations" / "en.json", {"common": {"save": "Save"}})
    (src / "app.ts").write_text('localize("common.save");\nlocalize("does.not.exist");\n')

    errors, _ = ct.check_typescript_translations(src)

    assert any("does.not.exist" in e and "missing" in e.lower() for e in errors)


def test_check_typescript_fails_on_orphan_en_key(tmp_path: Path) -> None:
    """Orphan keys are hard errors that block the push."""
    src = tmp_path / "src"
    write_json(
        src / "translations" / "en.json",
        {"common": {"save": "Save", "unused": "Unused"}},
    )
    (src / "app.ts").write_text('localize("common.save");\n')

    errors, _ = ct.check_typescript_translations(src)

    assert any("common.unused" in e and "orphan" in e.lower() for e in errors)


def test_main_fails_on_orphan_keys(tmp_path: Path) -> None:
    """Promoted: orphans block the push."""
    fe = tmp_path / "frontend" / "src"
    write_json(
        fe / "translations" / "en.json",
        {"common": {"save": "Save", "unused": "Unused"}},
    )
    (fe / "app.ts").write_text('localize("common.save");\n')

    comp = tmp_path / "custom_components" / "eppgrid"
    write_json(comp / "strings.json", {"a": "X"})
    write_json(comp / "translations" / "en.json", {"a": "X"})

    rc = ct.main(repo_root=tmp_path)

    assert rc != 0


def test_check_typescript_fails_when_extra_locale_keys_drift(tmp_path: Path) -> None:
    src = tmp_path / "src"
    write_json(src / "translations" / "en.json", {"a": "X", "b": "Y"})
    write_json(src / "translations" / "de.json", {"a": "X"})  # missing b
    (src / "app.ts").write_text('localize("a");\nlocalize("b");\n')

    errors, _ = ct.check_typescript_translations(src)

    assert any("de.json" in e and "b" in e for e in errors)


def test_main_returns_zero_when_repo_translations_are_consistent(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Run main() against a synthetic repo layout and confirm exit 0 path."""
    comp = tmp_path / "custom_components" / "eppgrid"
    write_json(comp / "strings.json", {"a": "X"})
    write_json(comp / "translations" / "en.json", {"a": "X"})

    fe = tmp_path / "frontend" / "src"
    write_json(fe / "translations" / "en.json", {"k": "V"})
    (fe / "app.ts").write_text('localize("k");\n')

    rc = ct.main(repo_root=tmp_path)

    assert rc == 0


def test_main_returns_nonzero_on_any_failure(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    comp = tmp_path / "custom_components" / "eppgrid"
    write_json(comp / "strings.json", {"a": "X"})
    write_json(comp / "translations" / "en.json", {"a": "DIFFERENT"})

    fe = tmp_path / "frontend" / "src"
    write_json(fe / "translations" / "en.json", {"k": "V"})
    (fe / "app.ts").write_text('localize("k");\n')

    rc = ct.main(repo_root=tmp_path)

    assert rc != 0
