"""Runtime BLE-scan toggle exposed by `bluetooth-base.yaml`.

`bluetooth-base.yaml` is shared by every BLE-capable variant (currently
both `wifi-ble-co2` and `ethernet-ble-co2`), so this toggle ships on
all of them. The combination of bluetooth_proxy + 100%-duty-cycle
active BLE scan is the dominant heap consumer on these firmwares
(~30-80 KB resident, with transient spikes during scan-result
processing). Users who don't actually have BLE devices to proxy still
pay the full heap cost, leaving them on the OOM edge during
simultaneous network load (TLS handshake, OTA download).

A user-facing switch lets them stop the scan at runtime — frees the scan
buffers and processing state (~15-30 KB) without reflashing. The proxy
component itself stays loaded (its `bluetooth_proxy.set_active(false)`
hook isn't exposed as a runtime automation action), but with no scan
results flowing in, the proxy is effectively idle.

Disabling reboots the device so any in-flight bluetooth_proxy GATT-client
connections drop cleanly; the on_boot reconciliation re-applies OFF state
immediately on restart since template switches restore state but don't
replay actions.

Knock-on effect: the OTA-error hook in this same file unconditionally
called `esp32_ble_tracker.start_scan` to restore scan after a failed OTA.
That'd accidentally re-enable the scan for users who'd toggled it off.
The hook now checks the toggle state and only restarts if the user
had it on.

These tests parse `bluetooth-base.yaml` in isolation. End-to-end coverage
of how this file's `esphome.on_boot` block merges with `everything-presence
-pro-base.yaml`'s existing on_boot hooks at compile time is provided by
the CI "Compile wifi-ble-co2" job, which fails if the merge produces an
invalid config.
"""

from pathlib import Path

import yaml

from tests.esphome_yaml import ESPHomeLoader

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_bluetooth_base() -> dict:
    text = (REPO_ROOT / "firmware" / "common" / "bluetooth-base.yaml").read_text()
    return yaml.load(text, Loader=ESPHomeLoader)


def _find_switch_by_id(switches: list, switch_id: str) -> dict | None:
    for s in switches:
        if isinstance(s, dict) and s.get("id") == switch_id:
            return s
    return None


def test_ble_scan_toggle_switch_is_present() -> None:
    """A user-facing switch must control whether the BLE scan runs."""
    doc = _load_bluetooth_base()
    switches = doc.get("switch", [])
    assert isinstance(switches, list) and switches, (
        "bluetooth-base.yaml must declare a top-level `switch:` list — needed "
        "for the runtime BLE-scan toggle that lets users free heap when they "
        "don't actually have proxied BLE devices."
    )
    sw = _find_switch_by_id(switches, "ble_scan_enabled")
    assert sw is not None, (
        "expected a switch with id `ble_scan_enabled` in bluetooth-base.yaml. "
        "This is the user-facing toggle for the BLE scan."
    )


def test_ble_scan_toggle_defaults_on_for_backwards_compat() -> None:
    """First-flash default must be ON — preserves current behavior.

    Existing users have BLE proxy + scan enabled by default. A change of
    default would silently disable BLE proxy on their next firmware update.
    """
    doc = _load_bluetooth_base()
    sw = _find_switch_by_id(doc["switch"], "ble_scan_enabled")
    assert sw is not None
    # Either explicit RESTORE_DEFAULT_ON or no restore_mode (which falls back
    # to the platform default that includes "on" in its semantics).
    restore_mode = sw.get("restore_mode")
    assert restore_mode in (None, "RESTORE_DEFAULT_ON", "ALWAYS_ON"), (
        f"ble_scan_enabled switch must default to ON for first-flash users; "
        f"got restore_mode={restore_mode!r}. Use RESTORE_DEFAULT_ON to keep "
        f"deliberate-off state across reboots while defaulting new devices on."
    )


def test_ble_scan_toggle_persists_across_reboots() -> None:
    """A user's deliberate "off" must survive a reboot or OTA.

    Without persistence, the device would silently re-enable BLE scanning
    every time it powers up — making the toggle near-useless for users who
    chose to disable it for heap headroom.
    """
    doc = _load_bluetooth_base()
    sw = _find_switch_by_id(doc["switch"], "ble_scan_enabled")
    assert sw is not None
    restore_mode = sw.get("restore_mode")
    assert restore_mode == "RESTORE_DEFAULT_ON", (
        f"ble_scan_enabled must use restore_mode RESTORE_DEFAULT_ON to survive "
        f"reboots — first-flash defaults on, but a deliberate user toggle to "
        f"off persists. Got {restore_mode!r}."
    )


def test_disabling_ble_scan_reboots_to_drop_active_proxy_connections() -> None:
    """Toggling OFF must reboot so any in-flight proxy GATT connections drop.

    `esp32_ble_tracker.stop_scan` halts new advertisement processing, but
    active bluetooth_proxy GATT-client connections to BLE devices stay live
    until they naturally drop (which can take minutes-to-hours). A reboot
    cleanly tears them down — bringing the device back to its lowest-heap
    steady state, which is the whole point of the toggle. The on_boot
    reconciliation then re-applies the OFF state immediately on restart.
    """
    doc = _load_bluetooth_base()
    sw = _find_switch_by_id(doc["switch"], "ble_scan_enabled")
    assert sw is not None
    turn_off_action = sw.get("turn_off_action", [])
    serialized = yaml.dump(turn_off_action)
    # Accept either a `lambda` calling App.safe_reboot()/App.reboot() or a
    # `button.press` of a restart button — both are idiomatic ways to
    # restart from an automation in ESPHome.
    assert "safe_reboot" in serialized or "App.reboot" in serialized or "button.press" in serialized, (
        "turn_off_action must restart the device to drop active proxy GATT "
        "connections — stop_scan alone leaves them live until they naturally "
        "drop. Found turn_off_action:\n"
        f"{serialized}"
    )


def test_ble_scan_toggle_lives_in_config_entity_category() -> None:
    """Switch must be entity_category: config so it lands under "Configuration"
    in the device page rather than as a primary entity.

    The repo's other firmware metadata tests lock down entity_category
    explicitly; without an assertion here a regression that drops the field
    or changes it (e.g. to diagnostic) would silently move the switch in HA.
    """
    doc = _load_bluetooth_base()
    sw = _find_switch_by_id(doc["switch"], "ble_scan_enabled")
    assert sw is not None
    assert sw.get("entity_category") == "config", (
        f"ble_scan_enabled switch must be entity_category: config so it appears "
        f"under the device's Configuration entities. Got {sw.get('entity_category')!r}."
    )


def test_ble_scan_toggle_turn_on_action_calls_start_scan() -> None:
    """Re-enabling the switch must actually re-start BLE scanning.

    Without this assertion, a regression that dropped `start_scan` from
    `turn_on_action` would let users toggle the switch back to ON in HA
    while BLE scanning silently stayed off until a reboot — making the
    re-enable path completely broken with no test signal.
    """
    doc = _load_bluetooth_base()
    sw = _find_switch_by_id(doc["switch"], "ble_scan_enabled")
    assert sw is not None
    turn_on_action = sw.get("turn_on_action", [])
    serialized = yaml.dump(turn_on_action)
    assert "esp32_ble_tracker.start_scan" in serialized, (
        "turn_on_action must call esp32_ble_tracker.start_scan. Without it the "
        "user toggling back ON would see the switch flip in HA but BLE scanning "
        "would stay off until reboot. Found turn_on_action:\n"
        f"{serialized}"
    )


def test_on_boot_reconciliation_block_is_present() -> None:
    """Boot reconciliation hook must reapply the persisted OFF state on restart.

    Template switches restore their state across reboots but do NOT replay
    the configured turn_off_action. Without an explicit on_boot block that
    checks the restored switch state and calls stop_scan, BLE scanning
    would come back up at boot for users who'd deliberately turned the
    switch off — defeating the whole point of persistence.

    This test parses bluetooth-base.yaml in isolation so it locks down the
    structure of the boot block. End-to-end coverage that the block survives
    package merging with the base file's existing on_boot hooks is provided
    by the CI "Compile wifi-ble-co2" job (see module docstring).
    """
    doc = _load_bluetooth_base()
    esphome_block = doc.get("esphome", {})
    on_boot = esphome_block.get("on_boot", [])
    assert isinstance(on_boot, list) and on_boot, (
        "bluetooth-base.yaml must declare an `esphome.on_boot:` list with at "
        "least one entry — needed to reconcile restored OFF state on boot."
    )
    serialized = yaml.dump(on_boot)
    assert "ble_scan_enabled" in serialized and "esp32_ble_tracker.stop_scan" in serialized, (
        "the on_boot hook must check `ble_scan_enabled` and call stop_scan. "
        "Without that the restored OFF state has no effect at boot. Found:\n"
        f"{serialized}"
    )


def test_ota_error_hook_respects_ble_scan_toggle() -> None:
    """OTA-error recovery must not re-enable scan if the user had it off.

    The OTA hooks (`on_begin: stop_scan`, `on_error: start_scan`) added in
    PR #149 unconditionally restart scanning on a failed OTA. That'd silently
    re-enable BLE for users who deliberately turned it off, defeating the
    point of the toggle. The on_error path must gate the restart on the
    toggle state.
    """
    doc = _load_bluetooth_base()
    ota_blocks = doc.get("ota", [])
    assert ota_blocks, "OTA hook block must exist in bluetooth-base.yaml"
    target = next(
        (b for b in ota_blocks if isinstance(b, dict) and "ota_http_request" in str(b.get("id"))),
        None,
    )
    assert target is not None, "expected !extend on ota_http_request"

    # The on_error block should reference the ble_scan_enabled state — either
    # via an `if` action gated on the switch / global, or by calling a script
    # that does the gate.
    on_error = target.get("on_error", [])
    serialized = yaml.dump(on_error)
    assert "ble_scan_enabled" in serialized, (
        "OTA on_error hook must check `ble_scan_enabled` before restarting BLE "
        "scan, otherwise users who toggled BLE off will have it silently "
        "re-enabled after a failed OTA. Found on_error block:\n"
        f"{serialized}"
    )
