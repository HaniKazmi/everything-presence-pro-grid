#pragma once
//
// Predicate: "has the LD2450 stopped sending frames for too long?"
//
// Item M6 (PR-8): if the radar dies, the UART wedges, or the producer thread
// hangs, no new frames arrive. The previous loop() gated all publish-throttles
// on `if (!frame_ready_) return;` — meaning every sensor froze at its last
// value with HA having no signal that the device is offline.
//
// The fix is to run throttles unconditionally and publish "no targets" /
// INACTIVE state when the latest frame is older than STALE_FRAME_MS. This
// helper is the gating predicate, factored out so the timer-arithmetic
// edge cases (cold start, unsigned wraparound) are pinned by tests.

#include <cstdint>

namespace epp {

/// True iff the LD2450 frame source is considered stale.
///
/// `now_ms` — current millis() reading.
/// `last_frame_ms` — millis() at which the last frame was received.
/// `has_frame` — false before the first frame ever arrives.
/// `threshold_ms` — staleness threshold (e.g. 5000ms = 5s).
///
/// Cold-start contract: when `has_frame` is false (no frame yet seen) we
/// return true so callers publish the "no signal" state from boot rather
/// than holding sensor publishes back until a first frame arrives. The
/// caller is responsible for the boot-settle window if a different cold-
/// start behaviour is wanted.
inline bool is_frame_stale(uint32_t now_ms, uint32_t last_frame_ms,
                           bool has_frame, uint32_t threshold_ms) {
  if (!has_frame) return true;
  // Use unsigned subtraction so millis() wrap (every ~49.7 days) is handled
  // correctly: (now - last) wraps to a small value if now just rolled past
  // zero, which is exactly the right answer for "how long ago".
  return (now_ms - last_frame_ms) >= threshold_ms;
}

}  // namespace epp
