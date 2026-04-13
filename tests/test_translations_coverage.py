"""Verify every translation_key used in code exists in strings.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

COMPONENT_DIR = Path(__file__).parent.parent / "custom_components" / "eppgrid"


def _load_strings() -> dict:
    with (COMPONENT_DIR / "strings.json").open() as f:
        return json.load(f)


def _find_used_translation_keys() -> set[str]:
    """Extract translation_key="..." literals from .py files in the component."""
    keys: set[str] = set()
    pattern = re.compile(r'translation_key\s*=\s*["\']([^"\']+)["\']')
    for py in COMPONENT_DIR.glob("*.py"):
        for match in pattern.finditer(py.read_text()):
            keys.add(match.group(1))
    return keys


def _find_used_entity_name_keys() -> set[str]:
    """Extract entity_names keys referenced via _resolve_zone_name()'s string construction.

    The resolver builds keys like f"component.{DOMAIN}.entity_names.<key>".
    We look for the suffix literals inside _resolve_zone_name().
    """
    keys: set[str] = set()
    # Match string literals inside device_manager.py that end with one of the
    # known entity_names key shapes. Conservative — just look for the hardcoded
    # key names used in the resolver.
    resolver_keys = {
        "zone_rest_of_room",
        "zone_with_name",
        "zone_rest_of_room_target_count",
        "zone_with_name_target_count",
    }
    dm = (COMPONENT_DIR / "device_manager.py").read_text()
    for k in resolver_keys:
        if f'"{k}"' in dm:
            keys.add(k)
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
    en = json.loads((base / "en.json").read_text())
    es = json.loads((base / "es.json").read_text())

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


def test_all_entity_name_keys_resolve():
    """Every entity_names key referenced in the resolver must exist in strings.json."""
    strings = _load_strings()
    available = set(strings.get("entity_names", {}).keys())
    used = _find_used_entity_name_keys()
    missing = used - available
    assert not missing, (
        f"Entity-name keys referenced in device_manager._resolve_zone_name but missing from strings.json: {missing}"
    )
