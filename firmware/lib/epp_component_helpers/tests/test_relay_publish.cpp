// Tests for the relay_should_update helper.
//
// Item M5 (PR-8): the relay update predicate must consult the component's OWN
// last-issued desired state, NOT the switch's reported state. The switch can
// be flipped by the user from HA, by an automation, or by an optimistic
// update; if we react to its current value the next loop tick fights user
// intent (we'd see "switch is on, my desired is off → turn off!" the moment
// after the user turned it on).
//
// The predicate is intentionally tiny but pinned by tests so the
// "cold-start-always-emits" and "ignore-switch-state" rules don't drift.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "epp_relay_publish.h"

using namespace epp;

TEST_CASE("cold start always emits regardless of desired") {
  // First evaluation after boot: we don't know what state the relay is in
  // (HA may have restored a stale value, the switch may be uninitialised).
  // Always emit so the relay reaches a known state.
  CHECK(relay_should_update(true, false, /*has_last=*/false) == true);
  CHECK(relay_should_update(false, false, /*has_last=*/false) == true);
  CHECK(relay_should_update(true, true, /*has_last=*/false) == true);
  CHECK(relay_should_update(false, true, /*has_last=*/false) == true);
}

TEST_CASE("after first emit, no change => no re-emit") {
  CHECK(relay_should_update(true, true, /*has_last=*/true) == false);
  CHECK(relay_should_update(false, false, /*has_last=*/true) == false);
}

TEST_CASE("after first emit, change => re-emit") {
  CHECK(relay_should_update(true, false, /*has_last=*/true) == true);
  CHECK(relay_should_update(false, true, /*has_last=*/true) == true);
}

TEST_CASE("predicate ignores switch state — only consults our last desired") {
  // The function signature itself enforces this: there is no parameter for
  // the switch's reported state. If the user toggled the switch from HA
  // (causing switch->state to differ from our last_desired), the predicate
  // would still return false here as long as our engine desired hasn't moved.
  // This is the central invariant: never fight user-driven toggles.
  CHECK(relay_should_update(/*desired=*/false, /*last_desired=*/false,
                            /*has_last=*/true) == false);
  CHECK(relay_should_update(/*desired=*/true, /*last_desired=*/true,
                            /*has_last=*/true) == false);
}
