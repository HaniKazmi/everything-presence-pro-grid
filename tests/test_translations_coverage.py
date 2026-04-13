"""Verify every translation_key used in code exists in strings.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

COMPONENT_DIR = Path(__file__).parent.parent / "custom_components" / "eppgrid"


def _load_strings() -> dict:
    with (COMPONENT_DIR / "strings.json").open(encoding="utf-8") as f:
        return json.load(f)


def _find_used_translation_keys() -> set[str]:
    """Extract translation_key="..." literals from .py files in the component."""
    keys: set[str] = set()
    pattern = re.compile(r'translation_key\s*=\s*["\']([^"\']+)["\']')
    for py in COMPONENT_DIR.glob("*.py"):
        for match in pattern.finditer(py.read_text(encoding="utf-8")):
            keys.add(match.group(1))
    return keys


def test_all_exception_keys_resolve():
    """Every translation_key referenced in code must exist under `exceptions` in strings.json."""
    strings = _load_strings()
    available = set(strings.get("exceptions", {}).keys())
    used = _find_used_translation_keys()
    missing = used - available
    assert not missing, (
        f"Referenced translation keys not found under 'exceptions' in strings.json: {missing}. "
        f"Add them to custom_components/eppgrid/strings.json or fix the key reference in code."
    )


def test_spanish_translation_keys_match_english():
    """custom_components/eppgrid/translations/es.json must have the same keys as strings.json."""
    base = COMPONENT_DIR / "translations"
    en = json.loads((base / "en.json").read_text(encoding="utf-8"))
    es = json.loads((base / "es.json").read_text(encoding="utf-8"))

    def flatten(obj, prefix=""):
        keys = set()
        if isinstance(obj, dict):
            for k, v in obj.items():
                path = f"{prefix}.{k}" if prefix else k
                if isinstance(v, dict):
                    keys.update(flatten(v, path))
                else:
                    keys.add(path)
        return keys

    en_keys = flatten(en)
    es_keys = flatten(es)
    missing = en_keys - es_keys
    extra = es_keys - en_keys
    assert not missing, f"Spanish translation missing keys: {sorted(missing)}"
    assert not extra, f"Spanish translation has extra keys: {sorted(extra)}"


def test_zone_name_translations_have_required_keys():
    """zone_name_translations.ZONE_NAMES must define all 4 required keys per language."""
    from custom_components.eppgrid.zone_name_translations import ZONE_NAMES

    required = {
        "zone_rest_of_room",
        "zone_with_name",
        "zone_rest_of_room_target_count",
        "zone_with_name_target_count",
    }
    assert "en" in ZONE_NAMES, "English zone names must be defined as the fallback"
    for lang, table in ZONE_NAMES.items():
        missing = required - set(table.keys())
        assert not missing, f"Language '{lang}' missing zone name keys: {missing}"
