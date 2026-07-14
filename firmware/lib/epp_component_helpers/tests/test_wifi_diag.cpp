// Tests for the WiFi drop diagnostics (issue #291).
//
// The device drops off WiFi without rebooting, so the only witness to the outage
// is the device itself — and it can only speak once it is back. What it says has
// to be RIGHT: a diagnostic that reports a confident wrong answer is worse than
// none, because the troubleshooting guide turns each reading into advice.
//
// The whole decision — when to record a drop, when to publish it, when to ignore
// an event — lives in WifiDropState so it can be tested here. The YAML in
// firmware/variants/wifi-ble-co2.yaml is then only glue: an IDF event handler
// that calls record_disconnect(), and wifi triggers that call take_drop().
//
// The trap this is built around: ESP-IDF re-fires WIFI_EVENT_STA_DISCONNECTED on
// every failed reconnect attempt (ESPHome retries via esp_wifi_connect() with a
// 500ms cooldown), so a naive "stash the latest event" records the last *retry*,
// not the drop.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "epp_wifi_diag.h"

using namespace epp;

// -- Recording the drop -------------------------------------------------------

TEST_CASE("a drop from an established link is recorded") {
  WifiDropState s;
  take_drop(s, 1'000);  // link comes up

  CHECK(record_disconnect(s, 200, -90, 5'000));

  CHECK(s.drops == 1);
  CHECK(s.reason == 200);
  CHECK(s.rssi == -90);
}

TEST_CASE("the retry storm does not overwrite the drop") {
  // THE bug this file exists for. ESPHome retries the connection every ~500ms
  // while the device is down, and each failed attempt posts another
  // STA_DISCONNECTED — typically reason 201 (No AP Found) with rssi 0. Recording
  // the latest event would report the last retry instead of the actual drop:
  // "No AP Found, 0 dBm, 3 seconds" for what was really a beacon timeout at
  // -90 dBm lasting 45 seconds. Every one of those numbers would be wrong, and
  // the troubleshooting guide reads each of them as a different diagnosis.
  WifiDropState s;
  take_drop(s, 1'000);
  record_disconnect(s, 200, -90, 5'000);  // the real drop: beacon timeout

  CHECK_FALSE(record_disconnect(s, 201, 0, 7'000));  // retry
  CHECK_FALSE(record_disconnect(s, 201, 0, 9'000));  // retry
  CHECK_FALSE(record_disconnect(s, 202, 0, 11'000));  // retry

  CHECK(s.drops == 1);      // one outage, not four
  CHECK(s.reason == 200);   // the drop's reason, not the last retry's
  CHECK(s.rssi == -90);     // the signal at the drop, not the retry's 0

  const DropReport report = take_drop(s, 50'000);
  CHECK(report.has_drop);
  CHECK(report.downtime_ms == 45'000);  // the whole outage, not the last retry
}

TEST_CASE("a failed first association at boot is not a drop") {
  // A device that fails its first association attempt (routine on a mesh, or an
  // AP that is momentarily busy) gets a STA_DISCONNECTED before it was ever
  // connected. Recording it would make the first successful connect publish a
  // phantom outage — inventing a drop that never happened, on a healthy device.
  WifiDropState s;  // link has never been up

  CHECK_FALSE(record_disconnect(s, 201, 0, 3'000));

  CHECK(s.drops == 0);
  const DropReport report = take_drop(s, 8'000);
  CHECK_FALSE(report.has_drop);
}

TEST_CASE("each outage is counted once, across many outages") {
  WifiDropState s;
  take_drop(s, 0);

  record_disconnect(s, 200, -80, 1'000);
  record_disconnect(s, 201, 0, 1'500);  // retry, ignored
  take_drop(s, 3'000);                  // back up

  record_disconnect(s, 8, -60, 10'000);
  take_drop(s, 12'000);

  CHECK(s.drops == 2);
}

// -- Publishing the drop ------------------------------------------------------

TEST_CASE("a drop is reported exactly once") {
  // take_drop() consumes the pending drop. Were it not consumed, an ESPHome-level
  // reconnect that follows no IDF disconnect event at all (a roam scan, or a lost
  // DHCP lease — both of which flip ESPHome's connected state on their own) would
  // republish the previous drop's reason and RSSI, with a downtime measured from
  // an outage that ended hours ago.
  WifiDropState s;
  take_drop(s, 0);
  record_disconnect(s, 200, -70, 1'000);

  CHECK(take_drop(s, 2'000).has_drop);
  CHECK_FALSE(take_drop(s, 3'000).has_drop);
  CHECK_FALSE(take_drop(s, 999'999).has_drop);
}

TEST_CASE("reconnecting without a disconnect event reports nothing") {
  WifiDropState s;
  take_drop(s, 1'000);

  const DropReport report = take_drop(s, 60'000);

  CHECK_FALSE(report.has_drop);
}

TEST_CASE("the report carries the drop, and the downtime is the whole outage") {
  WifiDropState s;
  take_drop(s, 1'000);
  record_disconnect(s, 8, -55, 20'000);

  const DropReport report = take_drop(s, 32'500);

  CHECK(report.has_drop);
  CHECK(report.reason == 8);
  CHECK(report.rssi == -55);
  CHECK(report.downtime_ms == 12'500);
}

TEST_CASE("downtime survives the millis() rollover") {
  // millis() wraps to 0 every ~49 days. A device that drops just before the wrap
  // and reconnects just after must not report a 49-day outage — unsigned
  // arithmetic gives the right answer, but only if nobody "fixes" it with a
  // signed subtraction or a `now < at` guard.
  WifiDropState s;
  take_drop(s, 0xFFFF'0000);
  record_disconnect(s, 200, -80, 0xFFFF'F000);  // 4,096 ms before the wrap

  const DropReport report = take_drop(s, 1'000);  // 1,000 ms after it

  CHECK(report.has_drop);
  CHECK(report.downtime_ms == 5'096);
}

TEST_CASE("a drop recorded while down is still reported after a later retry storm") {
  // The link never came back between the drop and these retries, so `pending`
  // must survive them: the user still needs to know why the device went away.
  WifiDropState s;
  take_drop(s, 1'000);
  record_disconnect(s, 200, -85, 2'000);
  for (uint32_t t = 3'000; t < 40'000; t += 500) {
    record_disconnect(s, 201, 0, t);
  }

  const DropReport report = take_drop(s, 40'000);

  CHECK(report.has_drop);
  CHECK(report.reason == 200);
  CHECK(report.downtime_ms == 38'000);
}

// -- The reason table ---------------------------------------------------------

TEST_CASE("beacon timeout is named — the device stopped hearing the AP") {
  // 200 = WIFI_REASON_BEACON_TIMEOUT. The signature of a device that drifted out
  // of range or slept through its DTIM beacons: nobody kicked it off.
  CHECK(wifi_disconnect_reason_str(200).find("Beacon Timeout") != std::string::npos);
}

TEST_CASE("AP-initiated kicks are named — the AP made this decision, not us") {
  // The ones that exonerate the firmware: the AP sent a deauth or disassoc. On a
  // mesh this is what band-steering and roaming look like from the device's side.
  CHECK(wifi_disconnect_reason_str(8).find("Association Leave") != std::string::npos);
  CHECK(wifi_disconnect_reason_str(2).find("Auth Expire") != std::string::npos);
  CHECK(wifi_disconnect_reason_str(12).find("BSS Transition") != std::string::npos);
}

TEST_CASE("code 4 is named for what it means: the AP dropped us for inactivity") {
  // IDF's own name for 4 is DISASSOC_DUE_TO_INACTIVITY (ASSOC_EXPIRE is a
  // deprecated alias). Calling it "Association Expire" would hide the one thing
  // it tells you — the AP saw no traffic from us, which on a power-saving ESP32
  // is a materially different story from a generic kick.
  CHECK(wifi_disconnect_reason_str(4).find("Inactivity") != std::string::npos);
}

TEST_CASE("the mesh/band-steering codes are named") {
  // 210-212 are exactly what an AP that steers clients produces, which is the
  // live hypothesis in #291 (the reporter is on an eero mesh).
  CHECK(wifi_disconnect_reason_str(210).find("No AP Found") != std::string::npos);
  CHECK(wifi_disconnect_reason_str(211).find("No AP Found") != std::string::npos);
  CHECK(wifi_disconnect_reason_str(212).find("No AP Found") != std::string::npos);
}

TEST_CASE("auth/handshake failures are named") {
  CHECK(wifi_disconnect_reason_str(15).find("Handshake Timeout") != std::string::npos);
  CHECK(wifi_disconnect_reason_str(202).find("Auth Fail") != std::string::npos);
  CHECK(wifi_disconnect_reason_str(201).find("No AP Found") != std::string::npos);
}

TEST_CASE("every reason string carries the numeric code") {
  // A named reason still needs its number: it is what the user pastes into an
  // issue and what we match against the IDF source. Names alone lose that.
  CHECK(wifi_disconnect_reason_str(200).find("200") != std::string::npos);
  CHECK(wifi_disconnect_reason_str(8).find("8") != std::string::npos);
}

TEST_CASE("unknown reason codes are still reportable") {
  // Vendor-specific and future IDF codes must not vanish into "Unknown" with no
  // number — that would throw away the only fact we have about the drop.
  CHECK(wifi_disconnect_reason_str(99).find("99") != std::string::npos);
}
