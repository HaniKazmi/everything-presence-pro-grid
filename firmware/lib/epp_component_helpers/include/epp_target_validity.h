#pragma once
//
// Predicate: "does this target have a valid position to look up?"
//
// Item H2 (PR-8): the previous check used `(x != 0 || y != 0)` to gate grid
// cell lookup. That treated a real target standing exactly at the origin
// (0, 0) as invalid — perfectly possible after the perspective transform.
// Replace with a proper status + finite-coords predicate.
//
// Two callsites in epp_component.cpp (zone-state JSON debug log + entity
// target throttle) share this helper so they can't drift apart.

#include <cmath>

#include "epp_types.h"

namespace epp {

/// True when the target has a real, queryable position.
///
/// - INACTIVE status => false: the engine has no current track for this slot.
/// - Non-finite x or y => false: the engine encodes "no position" as NaN, and
///   we defend against +/-inf even though the engine doesn't produce them.
/// - Otherwise true: ACTIVE or PENDING with finite (x, y), including (0, 0).
inline bool is_target_valid(TargetStatus status, float x, float y) {
  if (status == TargetStatus::INACTIVE) return false;
  return std::isfinite(x) && std::isfinite(y);
}

/// True when slot `i` of `result` carries a non-INACTIVE target.
///
/// Wraps the two-part guard (slot index in range AND status != INACTIVE) used
/// when iterating publish loops over result.targets[]. Coordinates are NOT
/// validated here — use `is_target_valid` for that. This predicate is the
/// "do I have anything to publish for this slot?" gate.
template <typename ResultT>
inline bool is_target_active(const ResultT &result, int i) {
  if (i < 0 || i >= result.target_count) return false;
  return result.targets[i].status != TargetStatus::INACTIVE;
}

}  // namespace epp
