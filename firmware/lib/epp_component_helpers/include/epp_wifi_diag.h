#pragma once

// WiFi drop diagnostics (issue #291).
//
// A device that falls off WiFi cannot report the fact while it is off WiFi, and
// tethering it over USB to watch the serial log moves it away from the spot
// where it fails. So it has to record what happened and publish once the link
// is back. The two pure pieces of that live here, host-tested; the ESP-IDF
// event plumbing that feeds them lives in `firmware/variants/wifi-ble-co2.yaml`.
//
// The ESP-IDF headers are pulled in only on-device: the YAML's `on_boot` lambda
// needs `esp_event_handler_instance_register` and `wifi_event_sta_disconnected_t`,
// and ESPHome does NOT include `esp_wifi.h` transitively on the ESP32 (its
// `wifi_component.h` gates `esp_wifi_types.h` behind SOC_WIFI_SUPPORT_5G, which
// the ESP32 does not define). This header is what the variant `includes:`, so
// it is the natural place to satisfy that.

#include <cstdint>
#include <string>

#ifdef ESP_PLATFORM
#include <esp_event.h>
#include <esp_wifi.h>
#endif

namespace epp {

/// Human-readable form of an ESP-IDF WIFI_EVENT_STA_DISCONNECTED reason code.
///
/// The codes are hardcoded rather than taken from IDF's WIFI_REASON_* enum so
/// this header stays host-testable. 1-24 are 802.11 wire values; 200+ are IDF's
/// own extensions. Both are stable ABI.
///
/// The number is always kept alongside the name: it is what a user pastes into
/// an issue and what we match against the IDF source, and unknown or vendor
/// codes would otherwise collapse into a useless "Unknown".
inline std::string wifi_disconnect_reason_str(uint8_t reason) {
  switch (reason) {
    // The AP made the decision — these exonerate the firmware. On a mesh they
    // are what band-steering and roaming look like from the device's side.
    case 2:
      return "Auth Expire (2)";
    case 3:
      return "Auth Leave (3)";
    case 4:
      return "Association Expire (4)";
    case 5:
      return "Association Too Many (5)";
    case 6:
      return "Not Authenticated (6)";
    case 7:
      return "Not Associated (7)";
    case 8:
      return "Association Leave (8)";
    // Key exchange — usually a wrong/rotated PSK or an AP that rotates GTK
    // faster than the station can keep up.
    case 15:
      return "Handshake Timeout (15)";
    case 16:
      return "Group Key Update Timeout (16)";
    case 23:
      return "802.1X Auth Failed (23)";
    case 24:
      return "Cipher Suite Rejected (24)";
    // Nobody kicked us — the device simply stopped hearing the AP. Out of
    // range, or asleep through its DTIM beacons.
    case 200:
      return "Beacon Timeout (200)";
    case 201:
      return "No AP Found (201)";
    case 202:
      return "Auth Fail (202)";
    case 203:
      return "Association Fail (203)";
    case 204:
      return "Handshake Timeout (204)";
    case 205:
      return "Connection Fail (205)";
    case 206:
      return "AP TSF Reset (206)";
    case 207:
      return "Roaming (207)";
    case 1:
      return "Unspecified (1)";
    default:
      return "Reason " + std::to_string(static_cast<unsigned>(reason));
  }
}

/// Milliseconds the WiFi link was down.
///
/// `disconnected_at_ms` is millis() at the drop; 0 means "never dropped", for
/// which the answer is 0 — the first connect after boot must not invent an
/// outage we would then go chasing.
///
/// The subtraction is deliberately unsigned: millis() wraps every ~49 days, and
/// unsigned arithmetic gives the correct gap straight through the rollover. A
/// signed subtraction, or a `now < at` guard, would turn a 5-second outage
/// across the wrap into a 49-day one.
inline uint32_t wifi_downtime_ms(uint32_t now_ms, uint32_t disconnected_at_ms) {
  if (disconnected_at_ms == 0) {
    return 0;
  }
  return now_ms - disconnected_at_ms;
}

}  // namespace epp
