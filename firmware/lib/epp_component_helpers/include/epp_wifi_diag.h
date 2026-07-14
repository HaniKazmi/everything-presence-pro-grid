#pragma once

// WiFi drop diagnostics (issue #291).
//
// A device that falls off WiFi cannot report the fact while it is off WiFi, and
// tethering it over USB to watch the serial log moves it away from the spot where
// it fails. So it records what happened and publishes once the link is back.
//
// What it says has to be RIGHT. A diagnostic that reports a confident wrong
// answer is worse than none: the troubleshooting guide turns each reading into
// advice, so a mislabelled drop sends the user chasing the wrong fault.
//
// The whole decision — when to record a drop, when to publish it, when to ignore
// an event — lives here so it can be host-tested. The YAML in
// firmware/variants/wifi-ble-co2.yaml is only glue: an ESP-IDF event handler that
// calls record_disconnect(), and wifi triggers that call take_drop().

#include <cstdint>
#include <string>

namespace epp {

/// Everything known about WiFi drops since boot.
///
/// Written from two tasks: `record_disconnect` from the ESP-IDF event task, and
/// `take_drop` from the ESPHome loop. Plain scalars rather than atomics — the
/// fields are aligned words no wider than the machine word, the two calls are
/// separated by the length of an outage, and the flags are ordered so a torn read
/// costs a missed report rather than a wrong one. Safe by inspection, not by type.
struct WifiDropState {
  /// Whether the link is currently established. Starts false: a device that has
  /// never associated cannot have "dropped".
  bool link_up = false;
  /// A recorded drop that has not yet been published.
  bool pending = false;
  /// Drops since boot. Counts outages, not disconnect events.
  uint32_t drops = 0;
  /// Reason code, RSSI and millis() — all as of the drop itself.
  uint8_t reason = 0;
  int8_t rssi = 0;
  uint32_t at_ms = 0;
};

/// The device's one drop record.
///
/// It lives here rather than in an ESPHome `globals:` entry for a mechanical
/// reason: ESPHome emits `includes:` into main.cpp *after* it declares the
/// globals, so `epp::WifiDropState` would not be a visible type at that point.
/// Keeping it here also saves four GlobalsComponent objects. Host tests construct
/// their own WifiDropState instances and never touch this one.
inline WifiDropState wifi_drop_state;

/// What to publish about an outage, once the link is back.
struct DropReport {
  bool has_drop = false;
  uint8_t reason = 0;
  int8_t rssi = 0;
  uint32_t downtime_ms = 0;
};

/// Record a WIFI_EVENT_STA_DISCONNECTED. Called for EVERY such event.
///
/// Returns true if the event was recorded as a drop.
///
/// Only the first event of an outage counts, and this is the crux of the whole
/// design. ESP-IDF re-fires the event on every failed reconnect attempt (ESPHome
/// retries via esp_wifi_connect() with a 500ms cooldown), so recording the latest
/// event would describe the last *retry* rather than the drop: a beacon timeout at
/// -90 dBm lasting 45 seconds would be reported as "No AP Found, 0 dBm, 3 seconds"
/// — every number wrong, and each one a different diagnosis in the user guide.
///
/// An event that arrives while the link was never up is not a drop either: a
/// failed first association at boot must not make the first successful connect
/// publish a phantom outage.
inline bool record_disconnect(WifiDropState &state, uint8_t reason, int8_t rssi, uint32_t now_ms) {
  if (!state.link_up) {
    return false;
  }
  state.link_up = false;
  state.pending = true;
  state.drops++;
  state.reason = reason;
  state.rssi = rssi;
  state.at_ms = now_ms;
  return true;
}

/// Mark the link up and take any drop that is waiting to be reported.
///
/// The drop is consumed, so it is reported exactly once. That matters because
/// ESPHome's connected state can flip without any IDF disconnect event behind it
/// (a roam scan, or a lost DHCP lease): were the drop not consumed, such a
/// reconnect would republish the previous drop's reason and RSSI with a downtime
/// measured from an outage that ended hours ago.
///
/// The downtime subtraction is deliberately unsigned: millis() wraps every ~49
/// days, and unsigned arithmetic gives the correct gap straight through the
/// rollover. A signed subtraction, or a `now < at` guard, would turn a 5-second
/// outage across the wrap into a 49-day one.
inline DropReport take_drop(WifiDropState &state, uint32_t now_ms) {
  DropReport report;
  state.link_up = true;
  if (state.pending) {
    state.pending = false;
    report.has_drop = true;
    report.reason = state.reason;
    report.rssi = state.rssi;
    report.downtime_ms = now_ms - state.at_ms;
  }
  return report;
}

namespace wifi_diag_detail {

struct DisconnectReason {
  uint8_t code;
  const char *name;
};

/// ESP-IDF WIFI_EVENT_STA_DISCONNECTED reason codes. 1-24 are 802.11 wire values;
/// 200+ are IDF's own extensions. Both are stable ABI, which is what lets this
/// table stay free of ESP-IDF headers and therefore host-testable. The variant
/// YAML static_asserts these against the real WIFI_REASON_* constants, so an IDF
/// renumbering breaks the build rather than silently mislabelling every drop.
///
/// Names follow what the code MEANS, not IDF's deprecated aliases — 4 is
/// "inactivity", not the legacy "ASSOC_EXPIRE", because on a power-saving ESP32
/// those are materially different stories.
constexpr DisconnectReason DISCONNECT_REASONS[] = {
    {1, "Unspecified"},
    // The AP made the decision — these exonerate the firmware. On a mesh they are
    // what band-steering and roaming look like from the device's side.
    {2, "Auth Expire"},
    {3, "Auth Leave"},
    {4, "Disassoc Due To Inactivity"},
    {5, "Association Too Many"},
    {6, "Not Authenticated"},
    {7, "Not Associated"},
    {8, "Association Leave"},
    {12, "BSS Transition Disassoc"},
    // Key exchange — usually a wrong or rotated PSK, or an AP rotating the GTK
    // faster than the station keeps up with.
    {15, "Handshake Timeout"},
    {16, "Group Key Update Timeout"},
    {23, "802.1X Auth Failed"},
    {24, "Cipher Suite Rejected"},
    // Nobody kicked us — the device simply stopped hearing the AP. Out of range,
    // or asleep through its DTIM beacons.
    {200, "Beacon Timeout"},
    {201, "No AP Found"},
    {202, "Auth Fail"},
    {203, "Association Fail"},
    {204, "Handshake Timeout"},
    {205, "Connection Fail"},
    {206, "AP TSF Reset"},
    {207, "Roaming"},
    // The AP is there but refused us on its terms — the classic signature of a
    // mesh steering a client it no longer wants on this node.
    {210, "No AP Found (Security Mismatch)"},
    {211, "No AP Found (Below Auth Threshold)"},
    {212, "No AP Found (Below RSSI Threshold)"},
};

}  // namespace wifi_diag_detail

/// Human-readable form of an ESP-IDF disconnect reason code.
///
/// The number is always kept alongside the name: it is what a user pastes into an
/// issue and what we match against the IDF source, and an unknown or vendor code
/// would otherwise collapse into a useless "Unknown".
inline std::string wifi_disconnect_reason_str(uint8_t reason) {
  const std::string code = " (" + std::to_string(static_cast<unsigned>(reason)) + ")";
  for (const auto &known : wifi_diag_detail::DISCONNECT_REASONS) {
    if (known.code == reason) {
      return known.name + code;
    }
  }
  return "Reason" + code;
}

}  // namespace epp
