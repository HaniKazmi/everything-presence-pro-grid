#pragma once
//
// NVS layout constants and per-blob version gating.
//
// The EPP component persists four independent blobs to NVS — perspective,
// grid, zones, relay. Each blob has its own schema version so that changing
// one blob's layout doesn't invalidate the others. The previous design
// (single global `version` key) forced re-flashing all blobs whenever any
// schema bumped, even though the unchanged ones were still readable.
//
// To bump a schema:
//   1. Change the on-flash byte layout in epp_component.cpp's save_*_to_nvs_().
//   2. Increment the matching *_SCHEMA_V constant below by one.
//   3. Add or update a host test in tests/test_nvs_layout.cpp.
//
// Per project memory `feedback_no_bwc`: bumping a version causes the next
// boot to drop the blob entirely. Users will reconfigure. No migration code.

#include <cstddef>
#include <cstdint>

#include "epp_types.h"

namespace epp {

// On-flash size of the grid blob. Layout: GRID_CELL_COUNT cell bytes followed
// by two little-endian floats (origin_x, origin_y). Pinned by a static_assert
// so a future GRID_COLS/ROWS change can't silently shift the layout.
static_assert(sizeof(float) == 4,
              "epp NVS grid blob format assumes 32-bit float (IEEE-754 single)");
static constexpr size_t GRID_BLOB_SIZE = GRID_CELL_COUNT + 2 * sizeof(float);

// Per-blob schema versions. Start at 1 so the value 0 (returned by NVS when
// the key is absent) acts as a sentinel for "missing" in should_load_blob().
static constexpr uint8_t PERSP_SCHEMA_V = 1;
static constexpr uint8_t GRID_SCHEMA_V  = 1;
static constexpr uint8_t ZONES_SCHEMA_V = 1;
static constexpr uint8_t RELAY_SCHEMA_V = 1;

/// Decide whether a stored blob should be loaded.
///
/// Returns true only if the stored version exactly matches the expected
/// (current firmware) version. A stored 0 means the version key was missing,
/// which we treat as "no compatible blob present" so the caller skips it.
/// Older or newer stored versions are also rejected — there is no migration
/// code, by project policy.
inline constexpr bool should_load_blob(uint8_t stored_version,
                                       uint8_t expected_version) {
  if (stored_version == 0) return false;
  return stored_version == expected_version;
}

}  // namespace epp
