#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_relay.h"

using namespace epp;

TEST_CASE("disabled mode: relay off regardless of contact mode") {
    auto r1 = evaluate_relay({RelayTriggerMode::DISABLED, RelayContactMode::NORMALLY_OPEN, true, true});
    CHECK(r1.should_update == true);
    CHECK(r1.desired_state == false);

    auto r2 = evaluate_relay({RelayTriggerMode::DISABLED, RelayContactMode::NORMALLY_CLOSED, true, true});
    CHECK(r2.should_update == true);
    CHECK(r2.desired_state == false);
}

TEST_CASE("manual mode: should_update is false") {
    auto r = evaluate_relay({RelayTriggerMode::MANUAL, RelayContactMode::NORMALLY_OPEN, true, true});
    CHECK(r.should_update == false);
}

TEST_CASE("motion mode NO: on when motion active") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_OPEN, true, false});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == true);
}

TEST_CASE("motion mode NO: off when motion inactive") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_OPEN, false, true});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == false);
}

TEST_CASE("motion mode NC: inverted") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION, RelayContactMode::NORMALLY_CLOSED, true, false});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == false);
}

TEST_CASE("presence mode NO: on when occupied") {
    auto r = evaluate_relay({RelayTriggerMode::PRESENCE, RelayContactMode::NORMALLY_OPEN, false, true});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == true);
}

TEST_CASE("presence mode NO: off when not occupied") {
    auto r = evaluate_relay({RelayTriggerMode::PRESENCE, RelayContactMode::NORMALLY_OPEN, true, false});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == false);
}

TEST_CASE("motion_or_presence NO: on when either") {
    auto r1 = evaluate_relay({RelayTriggerMode::MOTION_OR_PRESENCE, RelayContactMode::NORMALLY_OPEN, true, false});
    CHECK(r1.desired_state == true);

    auto r2 = evaluate_relay({RelayTriggerMode::MOTION_OR_PRESENCE, RelayContactMode::NORMALLY_OPEN, false, true});
    CHECK(r2.desired_state == true);

    auto r3 = evaluate_relay({RelayTriggerMode::MOTION_OR_PRESENCE, RelayContactMode::NORMALLY_OPEN, false, false});
    CHECK(r3.desired_state == false);
}

TEST_CASE("motion_or_presence NC: inverted") {
    auto r = evaluate_relay({RelayTriggerMode::MOTION_OR_PRESENCE, RelayContactMode::NORMALLY_CLOSED, false, false});
    CHECK(r.should_update == true);
    CHECK(r.desired_state == true);
}
