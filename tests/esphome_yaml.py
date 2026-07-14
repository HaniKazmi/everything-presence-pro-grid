"""Shared YAML loader and lookup helpers for ESPHome firmware tests.

ESPHome's YAML uses custom tags (!lambda, !include, !secret, !extend, ...)
that PyYAML's SafeLoader rejects. Tests that just need to inspect structural
fields don't care about the lambda contents — this loader treats every
custom tag as an opaque scalar / sequence / mapping so the file parses.

The firmware YAML never changes during a test run, so `load_yaml` is cached:
without it, each `find_*` call re-reads and re-parses the whole file.
"""

from functools import cache
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
BASE_YAML = REPO_ROOT / "firmware" / "common" / "everything-presence-pro-base.yaml"
WIFI_VARIANT_YAML = REPO_ROOT / "firmware" / "variants" / "wifi-ble-co2.yaml"


class ESPHomeLoader(yaml.SafeLoader):
    """SafeLoader that treats ESPHome custom tags as opaque values."""


def _esphome_tag_passthrough(loader, node):
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node, deep=True)
    return loader.construct_mapping(node, deep=True)


ESPHomeLoader.add_constructor(None, _esphome_tag_passthrough)


@cache
def load_yaml(path: Path) -> dict:
    """Parse an ESPHome YAML file, treating custom tags as opaque.

    TREAT THE RESULT AS READ-ONLY. It is cached, so every caller in the run shares
    one dict: a test that mutates it to set up a negative case would silently
    change what every later test sees. Copy it first if you need to modify it.
    """
    return yaml.load(path.read_text(), Loader=ESPHomeLoader)


def find_by_id(entries: list | None, entry_id: str) -> dict | None:
    """First entry in an ESPHome platform list with the given `id`."""
    for entry in entries or []:
        if isinstance(entry, dict) and entry.get("id") == entry_id:
            return entry
    return None


def find_by_platform(entries: list | None, platform: str) -> dict | None:
    """First entry in an ESPHome platform list with the given `platform`."""
    for entry in entries or []:
        if isinstance(entry, dict) and entry.get("platform") == platform:
            return entry
    return None
