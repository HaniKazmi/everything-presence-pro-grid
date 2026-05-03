// Tests for NVS layout constants and per-blob version gating.
//
// Item 5 (PR-8): GRID_BLOB_SIZE replaces hardcoded `408` in epp_component.cpp.
// The static_assert in the header is a compile-time check; the runtime test
// here pins the numeric value so a future GRID_COLS/ROWS change can't silently
// drift the on-flash blob layout without a deliberate decision.
//
// Item 2 (PR-8): per-blob schema versioning. should_load_blob() decides
// whether a stored blob is compatible with the running firmware's expected
// version. Each blob (perspective, grid, zones, relay) tracks its own version
// independently so changing one schema doesn't invalidate the others.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "epp_nvs_layout.h"
#include "epp_types.h"

using namespace epp;

TEST_CASE("GRID_BLOB_SIZE matches the on-flash layout (400 cells + 2 floats)") {
  // Pin the numeric size. If GRID_COLS/ROWS changes, this test fails first
  // and forces an explicit decision about the on-flash layout.
  CHECK(GRID_BLOB_SIZE == 408);
  CHECK(GRID_BLOB_SIZE == GRID_CELL_COUNT + 2 * sizeof(float));
}

TEST_CASE("per-blob schema versions are positive (zero is a sentinel)") {
  // A stored version of 0 means "absent / first boot". Schema versions must
  // start at 1 so should_load_blob() can treat 0 as a missing value.
  CHECK(PERSP_SCHEMA_V >= 1);
  CHECK(GRID_SCHEMA_V >= 1);
  CHECK(ZONES_SCHEMA_V >= 1);
  CHECK(RELAY_SCHEMA_V >= 1);
}

TEST_CASE("should_load_blob returns true when stored version matches expected") {
  CHECK(should_load_blob(1, 1) == true);
  CHECK(should_load_blob(7, 7) == true);
}

TEST_CASE("should_load_blob returns false on version mismatch") {
  // Stored older than expected — the layout we're about to read may not
  // match. Skip this blob; the others (with their own versions) restore
  // independently.
  CHECK(should_load_blob(1, 2) == false);
  // Stored newer than expected — same reasoning. Don't try to interpret a
  // future layout we don't know.
  CHECK(should_load_blob(3, 1) == false);
}

TEST_CASE("should_load_blob returns false when stored version is absent (0)") {
  // First boot or after a wipe: the version key isn't present and nvs_get
  // leaves the caller's variable at its initial 0. Treat as missing.
  CHECK(should_load_blob(0, 1) == false);
}
