#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_relay.h"

using namespace epp;

// Input helper: {trigger, contact, motion, static_presence, occupancy}

TEST_CASE("disabled mode: relay off regardless of contact mode") {
    auto r1 = evaluate_relay({RelayTriggerMode::DISABLED, RelayContactMode::NORMALLY_OPEN, true, true, true});
    CHECK(r1.desired_state == false);

    auto r2 = evaluate_relay({RelayTriggerMode::DISABLED, RelayContactMode::NORMALLY_CLOSED, true, true, true});
    CHECK(r2.desired_state == false);
}

TEST_CASE("motion mode NO: on when motion active") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_OPEN, true, false, false});
    CHECK(r.desired_state == true);
}

TEST_CASE("motion mode NO: off when motion inactive") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_OPEN, false, true, true});
    CHECK(r.desired_state == false);
}

TEST_CASE("motion mode NC: inverted") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_CLOSED, true, false, false});
    CHECK(r.desired_state == false);
}

TEST_CASE("presence mode NO: on when static presence active") {
    auto r = evaluate_relay({RelayTriggerMode::PRESENCE, RelayContactMode::NORMALLY_OPEN, false, true, false});
    CHECK(r.desired_state == true);
}

TEST_CASE("presence mode NO: off when static presence inactive") {
    auto r = evaluate_relay({RelayTriggerMode::PRESENCE, RelayContactMode::NORMALLY_OPEN, true, false, true});
    CHECK(r.desired_state == false);
}

TEST_CASE("presence mode NC: inverted") {
    auto r = evaluate_relay({RelayTriggerMode::PRESENCE, RelayContactMode::NORMALLY_CLOSED, false, true, false});
    CHECK(r.desired_state == false);
}

TEST_CASE("occupancy mode NO: on when occupied") {
    auto r = evaluate_relay({RelayTriggerMode::OCCUPANCY, RelayContactMode::NORMALLY_OPEN, false, false, true});
    CHECK(r.desired_state == true);
}

TEST_CASE("occupancy mode NO: off when not occupied") {
    auto r = evaluate_relay({RelayTriggerMode::OCCUPANCY, RelayContactMode::NORMALLY_OPEN, true, true, false});
    CHECK(r.desired_state == false);
}

TEST_CASE("occupancy mode NC: inverted") {
    auto r = evaluate_relay({RelayTriggerMode::OCCUPANCY, RelayContactMode::NORMALLY_CLOSED, false, false, false});
    CHECK(r.desired_state == true);
}

TEST_CASE("unknown trigger mode: fail safe to off") {
    auto r = evaluate_relay({static_cast<RelayTriggerMode>(99), RelayContactMode::NORMALLY_CLOSED, true, true, true});
    CHECK(r.desired_state == false);
}
