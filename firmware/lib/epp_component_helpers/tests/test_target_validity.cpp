// Tests for the is_target_valid helper.
//
// Item H2 (PR-8): the previous validity check used `(x != 0 || y != 0)` to
// decide whether to look up a target's grid cell. This treated a real target
// standing exactly at the origin (0, 0) — perfectly possible after perspective
// transform — as "invalid", silently mapping its zone to 0. The correct
// predicate gates on the engine's status (not INACTIVE) and a finite
// coordinate pair (the engine encodes "no position" as NaN).
//
// The helper is shared by two callsites in epp_component.cpp: the zone-state
// JSON debug log (zone-string assembly) and the entity-target throttle (zone
// sensor publish). Centralising the predicate keeps them in lock-step.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cmath>

#include "epp_target_validity.h"
#include "epp_types.h"

using namespace epp;

TEST_CASE("origin (0,0) with status ACTIVE is a valid target position") {
  // Regression: previously `(x != 0 || y != 0)` rejected this and the target
  // would silently report zone 0 even when standing on a different zone.
  CHECK(is_target_valid(TargetStatus::ACTIVE, 0.0f, 0.0f) == true);
}

TEST_CASE("typical positive coordinates with ACTIVE => valid") {
  CHECK(is_target_valid(TargetStatus::ACTIVE, 1.0f, 1.0f) == true);
  CHECK(is_target_valid(TargetStatus::ACTIVE, 1234.5f, 678.9f) == true);
}

TEST_CASE("negative-x with PENDING => valid") {
  // PENDING is a real status: the engine has begun tracking the target but
  // hasn't yet promoted it to ACTIVE. Position can still be queried.
  CHECK(is_target_valid(TargetStatus::PENDING, -1.0f, 0.0f) == true);
}

TEST_CASE("INACTIVE status => invalid regardless of coordinates") {
  CHECK(is_target_valid(TargetStatus::INACTIVE, 0.0f, 0.0f) == false);
  CHECK(is_target_valid(TargetStatus::INACTIVE, 100.0f, 200.0f) == false);
  CHECK(is_target_valid(TargetStatus::INACTIVE, NAN, NAN) == false);
}

TEST_CASE("NaN x => invalid even when ACTIVE") {
  CHECK(is_target_valid(TargetStatus::ACTIVE, NAN, 100.0f) == false);
}

TEST_CASE("NaN y => invalid even when ACTIVE") {
  CHECK(is_target_valid(TargetStatus::ACTIVE, 100.0f, NAN) == false);
}

TEST_CASE("both NaN => invalid") {
  CHECK(is_target_valid(TargetStatus::ACTIVE, NAN, NAN) == false);
  CHECK(is_target_valid(TargetStatus::PENDING, NAN, NAN) == false);
}

TEST_CASE("infinite coords => invalid (engine never produces these but be defensive)") {
  CHECK(is_target_valid(TargetStatus::ACTIVE,
                        std::numeric_limits<float>::infinity(),
                        0.0f) == false);
  CHECK(is_target_valid(TargetStatus::ACTIVE,
                        0.0f,
                        -std::numeric_limits<float>::infinity()) == false);
}
