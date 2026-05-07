#pragma once
//
// NVS layout constants and global schema version.
//
// The EPP component persists four blobs to NVS — perspective, grid, zones,
// relay — under the "epp" namespace. A single schema version gates the whole
// set: on a version mismatch, restore_from_nvs_ erases the namespace and
// starts fresh. There is no migration code (project policy `feedback_no_bwc`)
// and the blobs are tightly coupled in practice — a partial restore (e.g. a
// painted grid with no zone configs, or a perspective with no painted cells)
// produces an unusable device, so wiping all four is the same outcome the
// user gets from reconfiguring one.
//
// To bump the schema:
//   1. Change the on-flash byte layout in epp_component.cpp's save_*_to_nvs_().
//   2. Increment NVS_SCHEMA_VERSION below by one.
//   3. Update tests/test_nvs_layout.cpp.

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

// Upper bound on the base64-encoded grid input the API service should accept.
// Standard base64 expansion is ceil(n/3)*4 bytes plus an optional final
// newline. We allow 4 extra bytes of padding/whitespace slack so a stray
// newline or trailing space from the WS layer doesn't trigger a false
// rejection. Anything larger is treated as a buggy or malicious caller and
// rejected before the base64 decoder is invoked. The runtime check in
// tests/test_nvs_layout.cpp pins the numeric bounds (>= the canonical 536
// for 400 bytes, <= a sane upper limit) so future GRID_COLS/ROWS changes
// can't silently produce a too-small ceiling.
static constexpr size_t GRID_BASE64_MAX = ((GRID_CELL_COUNT + 2) / 3) * 4 + 4;
static_assert(GRID_BASE64_MAX >= GRID_CELL_COUNT,
              "Encoded form must be at least as big as decoded form");

// Schema version of the persisted NVS blob set. Bump on any on-flash byte
// layout change. 0 is the "absent key" sentinel returned by nvs_get_u8 on
// fresh install. The current value is 2 because pre-0.100 firmware wrote a
// global `version=2` key alongside today's blob layouts; matching that value
// means existing installs migrate without a wipe — the per-blob refactor in
// 0.100 didn't actually change any blob's byte layout.
static constexpr uint8_t NVS_SCHEMA_VERSION = 2;

}  // namespace epp
