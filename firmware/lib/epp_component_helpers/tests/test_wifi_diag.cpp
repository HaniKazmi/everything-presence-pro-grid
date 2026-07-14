// Tests for the WiFi drop diagnostics helpers (issue #291).
//
// The device drops off WiFi without rebooting, so the only witness to the
// outage is the device itself — and it can only speak once it is back. Two
// pieces of pure logic sit between the ESP-IDF disconnect event and the HA
// entities, and both are host-testable:
//
//   wifi_disconnect_reason_str()  IDF hands us a bare uint8_t. "202" tells a
//                                 user nothing; "Auth Fail" tells them their AP
//                                 rejected the device. The numeric code is kept
//                                 in the string because unknown/vendor codes
//                                 must still be reportable.
//
//   wifi_downtime_ms()            How long the link was actually gone. Computed
//                                 from millis() at reconnect minus millis() at
//                                 the drop — which wraps every ~49 days, and
//                                 has no meaning at all before the first drop.
//
// The reason codes are hardcoded numerics rather than IDF's WIFI_REASON_*
// enum so this header stays free of ESP-IDF and can be tested on the host.
// They are wire values from 802.11 (1-24) plus IDF's own extensions (200+),
// both stable ABI.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "epp_wifi_diag.h"

using namespace epp;

TEST_CASE("beacon timeout is named — the device stopped hearing the AP") {
  // 200 = WIFI_REASON_BEACON_TIMEOUT. The signature of a device that drifted
  // out of range or slept through its DTIM beacons: nobody kicked it, it just
  // stopped hearing the AP.
  CHECK(std::string(wifi_disconnect_reason_str(200)).find("Beacon Timeout") != std::string::npos);
}

TEST_CASE("AP-initiated kicks are named — the AP made this decision, not us") {
  // These are the ones that exonerate the firmware: the AP sent a deauth or
  // disassoc. On a mesh (#291's reporter is on eero) this is what band-steering
  // and roaming look like from the device's side.
  CHECK(std::string(wifi_disconnect_reason_str(8)).find("Association Leave") != std::string::npos);
  CHECK(std::string(wifi_disconnect_reason_str(2)).find("Auth Expire") != std::string::npos);
  CHECK(std::string(wifi_disconnect_reason_str(4)).find("Association Expire") != std::string::npos);
}

TEST_CASE("auth/handshake failures are named") {
  CHECK(std::string(wifi_disconnect_reason_str(15)).find("Handshake Timeout") != std::string::npos);
  CHECK(std::string(wifi_disconnect_reason_str(202)).find("Auth Fail") != std::string::npos);
  CHECK(std::string(wifi_disconnect_reason_str(201)).find("No AP Found") != std::string::npos);
}

TEST_CASE("every reason string carries the numeric code") {
  // A named reason still needs its number: it is what the user pastes into an
  // issue and what we match against the IDF source. Names alone lose that.
  CHECK(std::string(wifi_disconnect_reason_str(200)).find("200") != std::string::npos);
  CHECK(std::string(wifi_disconnect_reason_str(8)).find("8") != std::string::npos);
}

TEST_CASE("unknown reason codes are still reportable") {
  // Vendor-specific and future IDF codes must not vanish into "Unknown" with no
  // number — that would throw away the only fact we have about the drop.
  const std::string reason = wifi_disconnect_reason_str(99);
  CHECK(reason.find("99") != std::string::npos);
}

TEST_CASE("downtime is the gap between the drop and the reconnect") {
  CHECK(wifi_downtime_ms(10'000, 4'000) == 6'000);
}

TEST_CASE("downtime survives the millis() rollover") {
  // millis() wraps to 0 every ~49 days. A device that drops just before the
  // wrap and reconnects just after must not report a 49-day outage — unsigned
  // arithmetic gives the right answer, but only if nobody "fixes" it with a
  // signed subtraction or a now < at guard that returns garbage.
  const uint32_t at = 0xFFFF'F000;  // 4,096 ms before the wrap
  const uint32_t now = 1'000;       // 1,000 ms after it
  CHECK(wifi_downtime_ms(now, at) == 5'096);
}

TEST_CASE("no downtime before the first disconnect") {
  // at_ms == 0 is the "never dropped" sentinel. The first wifi.on_connect after
  // boot must not publish an outage: there wasn't one, and a bogus reading here
  // is worse than no reading — it invents a drop we would then go chasing.
  CHECK(wifi_downtime_ms(30'000, 0) == 0);
}
