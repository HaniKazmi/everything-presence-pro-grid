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
from typing import Any

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
    steady state, which is the whole point of the toggle.
    """
    doc = _load_bluetooth_base()
    sw = _find_switch_by_id(doc["switch"], "ble_scan_enabled")
    assert sw is not None
    turn_off_action = sw.get("turn_off_action", [])
    serialized = yaml.dump(turn_off_action)
    assert "safe_reboot" in serialized or "App.reboot" in serialized or "button.press" in serialized, (
        "turn_off_action must restart the device to drop active proxy GATT "
        "connections — stop_scan alone leaves them live until they naturally "
        "drop. Found turn_off_action:\n"
        f"{serialized}"
    )


def _action_contains_reboot(action: Any) -> bool:
    """True if `action` (any YAML node) is or contains a reboot call.

    Recognises the three idiomatic ESPHome ways to restart from an
    automation: `lambda: App.safe_reboot()`, `lambda: App.reboot()`, and
    `button.press: <restart_button_id>`.
    """
    if isinstance(action, dict):
        if "lambda" in action and isinstance(action["lambda"], str):
            body = action["lambda"]
            if "safe_reboot" in body or "App.reboot" in body:
                return True
        if "button.press" in action:
            return True
        # Recurse into common nested action keys (`then`, `else`, the body
        # of an `if:`, etc.) so we don't have to enumerate every wrapper.
        return any(_action_contains_reboot(v) for v in action.values())
    if isinstance(action, list):
        return any(_action_contains_reboot(item) for item in action)
    return False


def _find_reboot_inside_if_then(actions: list) -> bool:
    """True iff a reboot exists *inside* an `if:` action's `then:` list.

    Accepts the wrapping pattern:
      - if:
          condition: ...
          then:
            - ...
            - <reboot here>
    """
    for step in actions:
        if not isinstance(step, dict):
            continue
        if_block = step.get("if")
        if isinstance(if_block, dict):
            then_actions = if_block.get("then") or []
            if isinstance(then_actions, list) and _action_contains_reboot(then_actions):
                return True
    return False


def _action_has_top_level_reboot(actions: list) -> bool:
    """True if any reboot exists as a direct member of the action list (not
    wrapped in an `if:`). Used to detect the bootloop-causing pattern.
    """
    for step in actions:
        if isinstance(step, dict) and "if" in step:
            continue
        if _action_contains_reboot(step):
            return True
    return False


def test_turn_off_action_gates_reboot_to_avoid_bootloop() -> None:
    """Reboot in turn_off_action must live inside an `if:` `then:` block.

    ESPHome template switches re-fire the corresponding action on every
    boot when state is restored from NVS (see ESPHome
    `template/switch/template_switch.cpp` setup()). An unconditional
    `App.safe_reboot()` in `turn_off_action` therefore bootloops a device
    that's been deliberately turned off: NVS says OFF -> turn_off_action
    fires -> reboot -> NVS still OFF -> repeat. WiFi never associates;
    the device is unreachable until NVS is erased.

    The fix is to gate the reboot on a "boot has settled" condition (a
    global flag set after a delay in on_boot) so state-restoration on
    boot stops the scan but does NOT reboot, while a real user-initiated
    toggle (after boot is settled) still reboots cleanly. Walk the action
    structure to verify the reboot is *actually inside* the if block —
    a string match on `"if:"` would be fooled by an unrelated `if:`
    elsewhere in the action list.
    """
    doc = _load_bluetooth_base()
    sw = _find_switch_by_id(doc["switch"], "ble_scan_enabled")
    assert sw is not None
    turn_off_action = sw.get("turn_off_action", []) or []
    assert _action_contains_reboot(turn_off_action), (
        "turn_off_action must include a reboot to drop active proxy connections"
    )
    assert not _action_has_top_level_reboot(turn_off_action), (
        "turn_off_action has a top-level reboot — that bootloops the device "
        "on state-restored boot. Wrap it in an `if: condition: ... then:`. "
        f"Found:\n{yaml.dump(turn_off_action)}"
    )
    assert _find_reboot_inside_if_then(turn_off_action), (
        "turn_off_action must contain a reboot inside an `if:` `then:` block "
        "gated on a 'boot is settled' condition. Found:\n"
        f"{yaml.dump(turn_off_action)}"
    )


def test_boot_settled_global_flag_is_present() -> None:
    """A global flag `ble_scan_safe_to_reboot` (or equivalent) must be
    declared and set true after boot has settled, so turn_off_action can
    distinguish boot-time state restoration from a real user toggle.
    """
    doc = _load_bluetooth_base()
    globals_block = doc.get("globals", [])
    assert isinstance(globals_block, list) and globals_block, (
        "bluetooth-base.yaml must declare a `globals:` list with the "
        "ble_scan_safe_to_reboot flag — required to gate the reboot in "
        "turn_off_action and prevent the boot-time-restore bootloop."
    )
    flag = next(
        (g for g in globals_block if isinstance(g, dict) and g.get("id") == "ble_scan_safe_to_reboot"),
        None,
    )
    assert flag is not None, "expected a global with id `ble_scan_safe_to_reboot`"
    assert flag.get("type") == "bool"
    assert str(flag.get("initial_value", "")).strip("'\"") == "false", (
        "ble_scan_safe_to_reboot must initialize to false so an early-boot "
        "turn_off_action (state restore) sees the flag as false and skips "
        f"the reboot. Got initial_value={flag.get('initial_value')!r}."
    )

    # And there must be an on_boot hook that flips the flag to true after
    # a delay — otherwise it'd never become true and a real user toggle
    # would never reboot.
    esphome_block = doc.get("esphome", {})
    on_boot_serialized = yaml.dump(esphome_block.get("on_boot", []))
    assert "ble_scan_safe_to_reboot" in on_boot_serialized and "true" in on_boot_serialized, (
        "an on_boot hook must set ble_scan_safe_to_reboot = true after a "
        "delay so user-initiated turn_off_action calls reboot. Found on_boot:\n"
        f"{on_boot_serialized}"
    )


def test_on_boot_reconciliation_block_no_longer_needed() -> None:
    """The on_boot reconciliation hook is redundant once turn_off_action
    fires automatically on state restore.

    Template switches re-run turn_off_action on boot when state is restored
    to OFF — so the explicit `esphome.on_boot if not switch.is_on then
    stop_scan` block we used to have is doing the same thing twice. Remove
    it to keep boot-time logic minimal and reduce the surface area for
    similar early-boot timing bugs.
    """
    doc = _load_bluetooth_base()
    esphome_block = doc.get("esphome", {})
    on_boot_serialized = yaml.dump(esphome_block.get("on_boot", []))
    assert "esp32_ble_tracker.stop_scan" not in on_boot_serialized and "switch.is_on" not in on_boot_serialized, (
        "on_boot must NOT call stop_scan or check switch.is_on directly — "
        "that's the reconciliation pattern that caused the early-boot "
        "bricking issue. turn_off_action handles state restoration "
        "automatically. Found on_boot:\n"
        f"{on_boot_serialized}"
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
