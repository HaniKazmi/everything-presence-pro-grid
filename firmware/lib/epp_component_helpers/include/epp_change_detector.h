#pragma once
//
// Change detection for NVS save idempotency.
//
// The frontend may republish identical config (e.g. on reconnect or zone
// editor save with no real edits). Without these checks the component
// nvs_set_*/nvs_commit on every call, burning a flash erase cycle.
// Each helper compares the new payload against the most recently saved
// copy and returns true only when something actually changed.
//
// All helpers return true when `has_cache` is false — the first save after
// boot has nothing to compare against and must always go through.
//
// JSON comparison is byte-equality, not structural canonicalisation. If the
// frontend reformats whitespace we'll do one extra save; that's cheaper than
// running a JSON canonicaliser on the device.

#include <cstddef>
#include <cstdint>
#include <cstring>
#include <string>

namespace epp {

/// True if the new zones JSON differs from the cached copy.
inline bool did_zones_change(const std::string &fresh,
                             bool has_cache,
                             const std::string &cached) {
  if (!has_cache) return true;
  return fresh != cached;
}

/// True if the new perspective payload (8 coeffs + room_width + room_depth,
/// 10 floats total) differs from the cached copy.
inline bool did_perspective_change(const float fresh[10],
                                   bool has_cache,
                                   const float cached[10]) {
  if (!has_cache) return true;
  // memcmp is safe here because both buffers are populated from the same
  // strtof + memcpy path and a bitwise diff is exactly what we want — any
  // float bit-flip is a "real" change.
  return std::memcmp(fresh, cached, 10 * sizeof(float)) != 0;
}

/// True if the new grid blob differs from the cached copy. The lengths must
/// match for the buffers to be considered equal — if they differ, the helper
/// reports a change rather than reading past the smaller buffer.
inline bool did_grid_change(const uint8_t *fresh, size_t fresh_len,
                            bool has_cache,
                            const uint8_t *cached, size_t cached_len) {
  if (!has_cache) return true;
  if (fresh_len != cached_len) return true;
  return std::memcmp(fresh, cached, fresh_len) != 0;
}

}  // namespace epp
