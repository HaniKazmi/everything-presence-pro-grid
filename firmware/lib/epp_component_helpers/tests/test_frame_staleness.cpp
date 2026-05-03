// Tests for the is_frame_stale helper.
//
// Item M6 (PR-8): the previous loop() body returned early on `if (!frame_ready_)`,
// meaning every publish-throttle would freeze if the LD2450 stopped sending
// frames. The fix runs throttles unconditionally and publishes "no signal"
// state once frames go stale. This predicate is the gate.
//
// We pin three behaviours: cold-start (no frame yet), normal aging across
// the threshold, and unsigned millis() wraparound (every ~49.7 days).

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cstdint>

#include "epp_frame_staleness.h"

using namespace epp;

constexpr uint32_t THRESHOLD = 5000;  // 5s

TEST_CASE("cold start (has_frame false) is always considered stale") {
  // We must publish 'no signal' before the first frame ever arrives,
  // otherwise sensors stay at their default (false / "") with no event.
  CHECK(is_frame_stale(0, 0, /*has_frame=*/false, THRESHOLD) == true);
  CHECK(is_frame_stale(1000, 0, /*has_frame=*/false, THRESHOLD) == true);
  CHECK(is_frame_stale(1'000'000, 0, /*has_frame=*/false, THRESHOLD) == true);
}

TEST_CASE("fresh frame (just arrived) is not stale") {
  CHECK(is_frame_stale(/*now*/1000, /*last*/1000, true, THRESHOLD) == false);
}

TEST_CASE("frame just under threshold is not stale") {
  CHECK(is_frame_stale(/*now*/THRESHOLD - 1, /*last*/0, true, THRESHOLD) == false);
  CHECK(is_frame_stale(/*now*/4999, /*last*/0, true, THRESHOLD) == false);
}

TEST_CASE("frame at exactly threshold is stale (>=)") {
  // Use >= so the threshold is the inclusive boundary — matches the existing
  // throttle semantics in epp_component.cpp.
  CHECK(is_frame_stale(/*now*/THRESHOLD, /*last*/0, true, THRESHOLD) == true);
  CHECK(is_frame_stale(/*now*/5000, /*last*/0, true, THRESHOLD) == true);
}

TEST_CASE("frame well past threshold is stale") {
  CHECK(is_frame_stale(/*now*/100'000, /*last*/0, true, THRESHOLD) == true);
}

TEST_CASE("millis() wraparound: now wrapped back to a small value") {
  // Pre-wrap: last_frame_ms = 0xFFFFF000 (close to UINT32_MAX).
  // Post-wrap: now_ms = 100 (just after wrap).
  // Real elapsed: 100 - 0xFFFFF000 = 0x1100 (4352 ms) < threshold => not stale.
  uint32_t last = 0xFFFFF000u;
  uint32_t now = 100u;
  // Unsigned subtract: 100 - 0xFFFFF000 = 0x1100 (mod 2^32) = 4352
  CHECK(is_frame_stale(now, last, true, THRESHOLD) == false);

  // Same wrap, but more time has passed (now further along after wrap):
  // 6000 - 0xFFFFF000 = 0x1F00 (?) — let's be explicit:
  //   0xFFFFFFFF - 0xFFFFF000 = 0xFFF (4095 ms remaining before wrap)
  //   then 6000 ms after wrap → real elapsed = 4096 + 6000 = 10096 ms > 5000.
  uint32_t now_late = 6000u;
  CHECK(is_frame_stale(now_late, last, true, THRESHOLD) == true);
}

TEST_CASE("threshold of 0 means 'always stale once we have a frame'") {
  // Edge case: threshold == 0 means even a freshly arrived frame is stale.
  // We don't expect callers to use this, but the predicate must remain sane.
  CHECK(is_frame_stale(/*now*/1000, /*last*/1000, true, 0) == true);
}
