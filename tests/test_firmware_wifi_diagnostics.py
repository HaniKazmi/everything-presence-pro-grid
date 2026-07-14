"""WiFi drop diagnostics (wifi-ble-co2 variant only).

Issue #291: a device kept going unavailable in HA (`[Errno 113] Connect call
failed`) while never rebooting — uptime kept climbing, reset reason stayed
POWERON. The device drops off the network exactly when we most need to hear
from it, and serial tethering moves it away from the spot where it fails (when
the reporter tethered it, it stopped reproducing). So the device has to
*remember* what happened and tell us once it is back.

ESPHome logs the disconnect reason but exposes no entity for it, and its
`wifi_signal` sensor samples once a minute — up to 60s stale by the time the
link drops. ESP-IDF's `WIFI_EVENT_STA_DISCONNECTED` event carries both the
reason code and the RSSI at the moment of the drop, so a raw `esp_event`
handler gets us the exact values.

What the five entities answer:

  - WiFi Disconnects       Did the radio drop *at all*? Flat while HA loses the
                           device ⇒ the association held and the fault is in the
                           IP/API layer, not WiFi.
  - Disconnect Reason      AP kicked us (Association Leave / Auth Expire) vs we
                           lost the beacon (Beacon Timeout).
  - Disconnect Signal      RSSI at the drop: signal collapsed vs signal was fine
                           and we were kicked anyway.
  - WiFi BSSID             Which AP — a BSSID change per drop is mesh steering
                           (the reporter is on an eero mesh).
  - WiFi Downtime          How long the radio was actually gone. WiFi back in 2s
                           but HA unavailable for 30s ⇒ our reconnect, not WiFi.

All five publish ONLY from the connect/disconnect triggers — never on a timer.
A healthy device sends nothing, so they cost no traffic on a device that is
already streaming BLE proxy advertisements. States set while the device is
offline are held and shipped in the initial-state burst when the API
reconnects: that is what makes them survive the outage.
"""

from pathlib import Path

import yaml

from tests.esphome_yaml import ESPHomeLoader

REPO_ROOT = Path(__file__).resolve().parents[1]
BASE_YAML = REPO_ROOT / "firmware" / "common" / "everything-presence-pro-base.yaml"
WIFI_VARIANT_YAML = REPO_ROOT / "firmware" / "variants" / "wifi-ble-co2.yaml"


def _load(path: Path) -> dict:
    return yaml.load(path.read_text(), Loader=ESPHomeLoader)


def _variant() -> dict:
    return _load(WIFI_VARIANT_YAML)


def _find_by_id(entries: list | None, entry_id: str) -> dict | None:
    for entry in entries or []:
        if isinstance(entry, dict) and entry.get("id") == entry_id:
            return entry
    return None


def _find_by_platform(entries: list | None, platform: str) -> dict | None:
    for entry in entries or []:
        if isinstance(entry, dict) and entry.get("platform") == platform:
            return entry
    return None


def _sensor(sensor_id: str) -> dict | None:
    return _find_by_id(_variant().get("sensor"), sensor_id)


def _text_sensor(sensor_id: str) -> dict | None:
    return _find_by_id(_variant().get("text_sensor"), sensor_id)


def _global(global_id: str) -> dict | None:
    return _find_by_id(_variant().get("globals"), global_id)


def _wifi_trigger_text(trigger: str) -> str:
    """All lambda/action text under `wifi: on_connect:` / `on_disconnect:`."""
    return yaml.dump(_variant().get("wifi", {}).get(trigger, {}))


def _on_boot_text() -> str:
    """All action text under the variant's `esphome: on_boot:` hooks."""
    return yaml.dump(_variant().get("esphome", {}).get("on_boot", []))


# -- The raw ESP-IDF event handler --------------------------------------------


def test_disconnect_event_handler_registered_at_boot():
    """Only the raw IDF event carries the reason code — ESPHome exposes neither.

    `wifi.on_disconnect` tells us *that* we dropped, not *why*. The reason code
    is the single most diagnostic value here: it distinguishes "the AP kicked
    us" from "we lost the beacon", which point at completely different fixes.
    """
    boot = _on_boot_text()
    assert "esp_event_handler_instance_register" in boot, (
        "the wifi variant must register a raw esp_event handler at boot — "
        "ESPHome's wifi component logs the disconnect reason but exposes no "
        "getter for it, so the IDF event is the only source."
    )
    assert "WIFI_EVENT_STA_DISCONNECTED" in boot, "the esp_event handler must subscribe to WIFI_EVENT_STA_DISCONNECTED"


def test_disconnect_handler_captures_reason_and_rssi():
    """`wifi_event_sta_disconnected_t` carries both; take them from the event.

    RSSI must come from the event, not the `wifi_signal` sensor: that sensor
    polls once a minute, so at the moment of a drop its value can be a minute
    stale — useless for deciding whether the signal collapsed.
    """
    boot = _on_boot_text()
    assert "->reason" in boot, "handler must read `reason` off wifi_event_sta_disconnected_t"
    assert "->rssi" in boot, (
        "handler must read `rssi` off wifi_event_sta_disconnected_t — the "
        "RSSI at the instant of the drop, not the up-to-60s-stale poll from "
        "the wifi_signal sensor."
    )


def test_disconnect_count_is_edge_triggered_not_per_event():
    """Count drops, not disconnect events — they are very different numbers.

    While the device is off the network ESPHome keeps retrying, and every failed
    attempt fires another WIFI_EVENT_STA_DISCONNECTED. Counting raw events would
    report a single 60-second outage as ~10 disconnects, which is exactly the
    kind of inflated number that would send us chasing a nonexistent storm.

    ESPHome's `wifi.on_disconnect` fires only on the connected→disconnected edge
    (wifi_component.cpp: guarded by `handled_connected_state_`), so the counter
    belongs there. The raw handler only stashes the reason and RSSI.
    """
    boot = _on_boot_text()
    assert "wifi_disconnect_total" not in boot, (
        "the raw esp_event handler must NOT increment wifi_disconnect_total — it "
        "fires again on every failed reconnect attempt during an outage, so the "
        "count would measure retries, not drops."
    )
    assert "wifi_disconnect_total" in _wifi_trigger_text("on_disconnect"), (
        "wifi_disconnect_total must be incremented from wifi.on_disconnect, which "
        "fires once per connected→disconnected transition."
    )


def test_disconnect_globals_declared():
    """The handler runs in the IDF event task; it may only touch plain globals.

    Publishing an entity from the event task would reach into ESPHome's
    single-threaded loop from another task. The handler stashes; the
    `wifi.on_disconnect` trigger (main loop) publishes.
    """
    for global_id in (
        "wifi_disconnect_total",
        "wifi_disconnect_reason_code",
        "wifi_disconnect_rssi",
        "wifi_disconnect_at_ms",
    ):
        assert _global(global_id) is not None, (
            f"expected a global `{global_id}` — the esp_event handler runs in "
            "the IDF event task and must stash into globals for the main-loop "
            "trigger to publish, never call publish_state() itself."
        )


# -- The entities -------------------------------------------------------------


def test_disconnect_count_sensor():
    """The discriminator: did the radio drop at all, or only the API?"""
    sensor = _sensor("wifi_disconnect_count_sensor")
    assert sensor is not None, (
        "expected a `wifi_disconnect_count_sensor` counting WIFI_EVENT_STA_DISCONNECTED "
        "since boot. If HA loses the device while this stays flat, the association "
        "held and the bug is above WiFi — that single fact redirects the whole "
        "investigation, and nothing we ship today can tell us."
    )
    assert sensor.get("platform") == "template"
    assert sensor.get("entity_category") == "diagnostic"
    assert sensor.get("state_class") == "total_increasing", (
        "a monotonic since-boot counter is total_increasing — it resets to 0 on "
        "reboot, and HA must not read that reset as a negative delta."
    )


def test_disconnect_reason_text_sensor():
    """Why the link went away — AP kicked us vs we lost the beacon."""
    sensor = _text_sensor("wifi_disconnect_reason_sensor")
    assert sensor is not None, "expected a `wifi_disconnect_reason_sensor` text sensor"
    assert sensor.get("platform") == "template"
    assert sensor.get("entity_category") == "diagnostic"


def test_disconnect_rssi_sensor():
    """Signal at the instant of the drop — collapse vs kicked-while-healthy."""
    sensor = _sensor("wifi_disconnect_rssi_sensor")
    assert sensor is not None, "expected a `wifi_disconnect_rssi_sensor`"
    assert sensor.get("platform") == "template"
    assert sensor.get("entity_category") == "diagnostic"
    assert sensor.get("unit_of_measurement") == "dBm"
    assert sensor.get("device_class") == "signal_strength"


def test_bssid_text_sensor():
    """Which AP we are on. A BSSID change at each drop is mesh steering."""
    text_sensors = _variant().get("text_sensor")
    wifi_info = _find_by_platform(text_sensors, "wifi_info")
    assert wifi_info is not None, (
        "expected a `platform: wifi_info` text_sensor exposing the BSSID — on a "
        "mesh (the #291 reporter is on eero) a BSSID that changes at every drop "
        "means the AP is steering the device between nodes, which looks exactly "
        "like a firmware fault from HA's side."
    )
    bssid = wifi_info.get("bssid")
    assert isinstance(bssid, dict), "wifi_info text_sensor must define `bssid:`"
    assert bssid.get("entity_category") == "diagnostic"


def test_downtime_sensor():
    """Separates a WiFi outage from a slow reconnect on our side."""
    sensor = _sensor("wifi_downtime_sensor")
    assert sensor is not None, (
        "expected a `wifi_downtime_sensor` reporting how many seconds the last "
        "outage lasted. If WiFi returns in 2s but HA stays unavailable for 30s, "
        "the fault is our reconnect path, not the network."
    )
    assert sensor.get("platform") == "template"
    assert sensor.get("entity_category") == "diagnostic"
    assert sensor.get("unit_of_measurement") == "s"
    assert sensor.get("device_class") == "duration"


# -- Event-driven, not periodic -----------------------------------------------


def test_diagnostic_sensors_never_poll():
    """A healthy device must send nothing.

    These sit on a device already streaming BLE proxy advertisements and (with
    the panel open) 5Hz display frames. Diagnostics that poll would add traffic
    forever to buy nothing — every value here only changes when the link does.
    `update_interval: never` makes that a property of the config rather than a
    promise in a comment.
    """
    for sensor_id in (
        "wifi_disconnect_count_sensor",
        "wifi_disconnect_rssi_sensor",
        "wifi_downtime_sensor",
    ):
        sensor = _sensor(sensor_id)
        assert sensor is not None
        assert sensor.get("update_interval") == "never", (
            f"{sensor_id} must set `update_interval: never` — it is published "
            "from the wifi connect/disconnect triggers, and a template sensor "
            "left on the default 60s interval polls forever for no reason."
        )

    reason = _text_sensor("wifi_disconnect_reason_sensor")
    assert reason is not None
    assert reason.get("update_interval") == "never"


def test_disconnect_trigger_publishes_the_drop():
    """Published from the main-loop trigger, while offline.

    ESPHome holds the state and ships it in the initial-state burst when the API
    reconnects — which is the whole trick: the values describe an outage that,
    by definition, we could not transmit during.
    """
    text = _wifi_trigger_text("on_disconnect")
    for sensor_id in (
        "wifi_disconnect_count_sensor",
        "wifi_disconnect_reason_sensor",
        "wifi_disconnect_rssi_sensor",
    ):
        assert sensor_id in text, f"wifi.on_disconnect must publish {sensor_id}"


def test_connect_trigger_publishes_downtime():
    """Downtime is only knowable on the way back up."""
    assert "wifi_downtime_sensor" in _wifi_trigger_text("on_connect"), (
        "wifi.on_connect must publish wifi_downtime_sensor — the length of the "
        "outage can only be computed once the link returns."
    )


def test_led_script_still_driven_by_wifi_triggers():
    """Regression guard: the triggers already drove the LEDs. Don't drop that.

    `control_leds` is what turns the LED to "connecting" when WiFi goes away.
    Appending publishes to these triggers must not displace it.
    """
    for trigger in ("on_connect", "on_disconnect"):
        assert "control_leds" in _wifi_trigger_text(trigger), (
            f"wifi.{trigger} must still execute the control_leds script — it "
            "drives the connection-status LED and predates these diagnostics."
        )


# -- Placement ----------------------------------------------------------------


def test_wifi_diagnostics_absent_from_shared_base():
    """The ethernet variant includes the base and has no `wifi:` component.

    Same trap as `wifi_signal` (see test_firmware_wifi_signal.py): a wifi_info
    text sensor in the shared base fails the ethernet config outright with
    `requires component wifi`. Keep all of this in the wifi variant.
    """
    base = _load(BASE_YAML)
    assert _find_by_platform(base.get("text_sensor"), "wifi_info") is None, (
        "wifi_info must not live in everything-presence-pro-base.yaml — the "
        "ethernet-ble-co2 variant includes the base but has no `wifi:` "
        "component, so ESPHome fails its config."
    )
    for sensor_id in ("wifi_disconnect_count_sensor", "wifi_disconnect_rssi_sensor", "wifi_downtime_sensor"):
        assert _find_by_id(base.get("sensor"), sensor_id) is None, (
            f"{sensor_id} must live in the wifi variant, not the shared base"
        )
