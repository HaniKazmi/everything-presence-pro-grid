"""The panel's log-category dropdown must enable the right firmware tags.

The `epp_set_log_level` API action in `everything-presence-pro-base.yaml`
maps each user-facing log category (`system`, `epp`, `led`, `networking`,
`ble`, `co2`) to the underlying ESPHome log tags whose level the action
should change. The firmware globally suppresses logging on boot
(`set_log_level(ESPHOME_LOG_LEVEL_NONE)` at priority 200), so any tag
the user wants to debug MUST be listed in this mapping — otherwise
flipping the panel's "BLE → Debug" toggle silently does nothing for the
tags the user actually cares about (e.g. scan results, proxy events).

A real bug: the BLE category was missing `esp32_ble_tracker` and
`bluetooth_proxy`, so users debugging "is BLE actually scanning?" saw
no logs even with debug enabled.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from tests.esphome_yaml import ESPHomeLoader

REPO_ROOT = Path(__file__).resolve().parents[1]


def _ble_set_log_level_calls() -> set[str]:
    """Parse the lambda body and return tag names whose log level the
    `category == "ble"` branch sets.

    Walks the YAML structurally to find `epp_set_log_level`'s lambda
    body, then regex-extracts the tag-name argument of every
    `logger.set_log_level("<tag>", log_level);` call inside that
    branch. Robust against:
      - reformatting of the lambda body (whitespace, comments, newlines)
      - additional `else if` clauses in any order
      - tag names appearing in comments rather than real calls
    """
    text = (REPO_ROOT / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()
    doc = yaml.load(text, Loader=ESPHomeLoader)
    actions = (doc.get("api") or {}).get("actions") or []
    action = next((a for a in actions if isinstance(a, dict) and a.get("action") == "epp_set_log_level"), None)
    assert action is not None, "epp_set_log_level action must exist on the api: block"

    lambda_body: str | None = None
    for step in action.get("then", []):
        if isinstance(step, dict) and isinstance(step.get("lambda"), str):
            lambda_body = step["lambda"]
            break
    assert lambda_body is not None, "epp_set_log_level must contain a lambda step holding the category mapping"

    # Strip C++ // and /* */ comments so tag strings inside comments don't false-positive
    no_line_comments = re.sub(r"//[^\n]*", "", lambda_body)
    no_comments = re.sub(r"/\*.*?\*/", "", no_line_comments, flags=re.DOTALL)

    # Isolate the body of the `category == "ble"` else-if branch (between
    # its opening `{` and the matching `}`). Walk braces explicitly so
    # nested constructs would still parse cleanly if someone adds them.
    match = re.search(r'category\s*==\s*"ble"\s*\)\s*\{', no_comments)
    assert match is not None, 'must have a `category == "ble"` else-if branch'
    start = match.end()
    depth = 1
    i = start
    while i < len(no_comments) and depth > 0:
        if no_comments[i] == "{":
            depth += 1
        elif no_comments[i] == "}":
            depth -= 1
        i += 1
    ble_body = no_comments[start : i - 1]

    return set(re.findall(r'logger\.set_log_level\(\s*"([^"]+)"\s*,', ble_body))


def test_ble_log_category_includes_tracker_and_proxy() -> None:
    """The `ble` log category must enable scan-result and proxy-event tags.

    Without `esp32_ble_tracker`, the user can't see whether the scan is
    actually running. Without `bluetooth_proxy`, they can't see proxy
    connection / disconnection events.
    """
    tags = _ble_set_log_level_calls()
    assert "esp32_ble_tracker" in tags, (
        "BLE log category must enable esp32_ble_tracker so scan results "
        f"(`Found device ...`) appear in debug logs. Found tags: {sorted(tags)}"
    )
    assert "bluetooth_proxy" in tags, (
        "BLE log category must enable bluetooth_proxy so proxy connection "
        f"events appear in debug logs. Found tags: {sorted(tags)}"
    )
