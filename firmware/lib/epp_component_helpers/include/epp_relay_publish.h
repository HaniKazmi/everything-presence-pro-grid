#pragma once
//
// Predicate: "should this loop tick re-issue a relay turn_on/turn_off call?"
//
// Item M5 (PR-8): the previous code read `relay_switch_->state` directly and
// only called turn_on/turn_off when the engine's desired state differed. That
// race-conditions with HA: if the user toggles the switch from HA, ESPHome's
// state flips, and the next loop tick sees a "difference" between engine
// desired and switch state, fighting the user.
//
// The fix is to track the component's OWN last-issued desired state separately
// from the switch's reported state. We only re-issue when *our* last decision
// changes — never to fight a user-driven toggle.

namespace epp {

/// True iff this loop tick should re-issue turn_on/turn_off for the relay.
///
/// `desired` — the engine's freshly-evaluated relay state.
/// `last_desired` — the desired value we last issued to the switch.
/// `has_last` — false if we have never issued a desired state (cold start).
///
/// Cold start always emits so the relay reaches a known state. After that,
/// only emit when our own desired changes — ignore the switch's reported
/// state, which the user may have toggled via HA.
inline bool relay_should_update(bool desired, bool last_desired, bool has_last) {
  if (!has_last) return true;
  return desired != last_desired;
}

}  // namespace epp
