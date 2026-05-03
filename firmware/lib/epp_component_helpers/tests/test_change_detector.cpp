// Tests for change-detector helpers used to make NVS saves idempotent.
//
// Item 4 (PR-8): set_perspective / set_grid / set_zones each previously
// nvs_set_*/nvs_commit on every call regardless of whether the payload had
// changed. The frontend can republish identical config (e.g. on reconnect)
// and burn flash cycles. The helpers below let the component compare
// incoming payloads against a cached copy and skip the write when they
// match.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cstdint>
#include <cstring>
#include <string>

#include "epp_change_detector.h"

using namespace epp;

TEST_CASE("did_zones_change: no cache => always treat as changed") {
  // First call after boot has nothing to compare against.
  CHECK(did_zones_change("[{}]", /*has_cache=*/false, /*cached=*/"") == true);
  CHECK(did_zones_change("", /*has_cache=*/false, /*cached=*/"") == true);
}

TEST_CASE("did_zones_change: identical payload => no change") {
  std::string cached = "{\"zone_slots\":[null]}";
  CHECK(did_zones_change(cached, /*has_cache=*/true, cached) == false);
}

TEST_CASE("did_zones_change: differing payload => change") {
  std::string cached = "{\"zone_slots\":[null]}";
  std::string fresh  = "{\"zone_slots\":[{\"trigger\":5}]}";
  CHECK(did_zones_change(fresh, /*has_cache=*/true, cached) == true);
}

TEST_CASE("did_zones_change: byte-equality is the contract (no JSON canon)") {
  // The helper deliberately does NOT canonicalise JSON. If the frontend
  // reformats whitespace, that's a real new payload — we save it. The cost
  // (rare extra write) beats the complexity of a canonicaliser on-device.
  std::string cached = "{\"a\":1}";
  std::string spaced = "{ \"a\":1 }";
  CHECK(did_zones_change(spaced, /*has_cache=*/true, cached) == true);
}

TEST_CASE("did_perspective_change: no cache => always treat as changed") {
  float fresh[10] = {1, 2, 3, 4, 5, 6, 7, 8, 100.0f, 200.0f};
  float cached[10]{};
  CHECK(did_perspective_change(fresh, /*has_cache=*/false, cached) == true);
}

TEST_CASE("did_perspective_change: identical 10-float payload => no change") {
  float a[10] = {1, 2, 3, 4, 5, 6, 7, 8, 100.0f, 200.0f};
  float b[10] = {1, 2, 3, 4, 5, 6, 7, 8, 100.0f, 200.0f};
  CHECK(did_perspective_change(a, /*has_cache=*/true, b) == false);
}

TEST_CASE("did_perspective_change: any single coefficient differs => change") {
  float a[10] = {1, 2, 3, 4, 5, 6, 7, 8, 100.0f, 200.0f};
  float b[10] = {1, 2, 3, 4, 5, 6, 7, 8, 100.0f, 200.0f};
  for (int i = 0; i < 10; ++i) {
    float orig = b[i];
    b[i] = orig + 0.001f;
    CHECK_MESSAGE(did_perspective_change(a, /*has_cache=*/true, b) == true,
                  "perspective change should be detected at index ", i);
    b[i] = orig;
  }
  // Sanity: restored fully, should now compare equal.
  CHECK(did_perspective_change(a, /*has_cache=*/true, b) == false);
}

TEST_CASE("did_perspective_change: room-width vs coefficient differences both detected") {
  // The room dimensions live at index 8 and 9 — make sure they aren't
  // accidentally excluded from the comparison.
  float a[10] = {1, 2, 3, 4, 5, 6, 7, 8, 4000.0f, 3000.0f};
  float b[10] = {1, 2, 3, 4, 5, 6, 7, 8, 4000.0f, 3500.0f};
  CHECK(did_perspective_change(a, /*has_cache=*/true, b) == true);
}

TEST_CASE("did_grid_change: no cache => always treat as changed") {
  uint8_t fresh[8]{1, 2, 3, 4, 5, 6, 7, 8};
  uint8_t cached[8]{};
  CHECK(did_grid_change(fresh, sizeof(fresh),
                        /*has_cache=*/false,
                        cached, sizeof(cached)) == true);
}

TEST_CASE("did_grid_change: identical bytes => no change") {
  uint8_t a[8] = {1, 2, 3, 4, 5, 6, 7, 8};
  uint8_t b[8] = {1, 2, 3, 4, 5, 6, 7, 8};
  CHECK(did_grid_change(a, sizeof(a),
                        /*has_cache=*/true,
                        b, sizeof(b)) == false);
}

TEST_CASE("did_grid_change: single byte differs => change") {
  uint8_t a[8] = {1, 2, 3, 4, 5, 6, 7, 8};
  uint8_t b[8] = {1, 2, 3, 4, 5, 6, 7, 9};  // last byte differs
  CHECK(did_grid_change(a, sizeof(a),
                        /*has_cache=*/true,
                        b, sizeof(b)) == true);
}

TEST_CASE("did_grid_change: differing length => always change") {
  // Defensive: if the grid layout ever changes size at runtime (it shouldn't
  // — GRID_BLOB_SIZE is fixed) the helper must still return a sensible
  // answer rather than reading past the smaller buffer.
  uint8_t a[8] = {1, 2, 3, 4, 5, 6, 7, 8};
  uint8_t b[7] = {1, 2, 3, 4, 5, 6, 7};
  CHECK(did_grid_change(a, sizeof(a),
                        /*has_cache=*/true,
                        b, sizeof(b)) == true);
}
