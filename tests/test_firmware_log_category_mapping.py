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

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_base_yaml_text() -> str:
    return (REPO_ROOT / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()


def test_ble_log_category_includes_tracker_and_proxy() -> None:
    """The `ble` log category must enable scan-result and proxy-event tags.

    Without `esp32_ble_tracker`, the user can't see whether the scan is
    actually running. Without `bluetooth_proxy`, they can't see proxy
    connection / disconnection events.
    """
    text = _load_base_yaml_text()
    # Find the lambda body that handles category == "ble"
    ble_branch = text.split('category == "ble"')[1].split("else if")[0]
    assert '"esp32_ble_tracker"' in ble_branch, (
        "BLE log category must enable esp32_ble_tracker so scan results "
        "(`Found device ...`) appear in debug logs. Found branch:\n"
        f"{ble_branch}"
    )
    assert '"bluetooth_proxy"' in ble_branch, (
        "BLE log category must enable bluetooth_proxy so proxy connection "
        "events appear in debug logs. Found branch:\n"
        f"{ble_branch}"
    )
