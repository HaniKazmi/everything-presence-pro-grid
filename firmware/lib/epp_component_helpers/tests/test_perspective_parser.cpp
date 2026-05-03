// Tests for parse_perspective_coefficients.
//
// Item H3 (PR-8): the previous parser in EPPComponent::set_perspective walked
// strtof + comma in a hand-rolled loop and silently swallowed extra commas,
// non-finite coefficients, and trailing garbage. A frontend bug or stray
// transmission could install bad calibration without any warning.
//
// The replacement parser:
//   - Requires exactly 8 floats.
//   - Each float must be std::isfinite (rejects NaN and +/-inf).
//   - No empty fields (consecutive commas, leading/trailing comma).
//   - No trailing garbage after the 8th float (whitespace OK).

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "epp_perspective_parser.h"

using namespace epp;

TEST_CASE("happy path: eight floats parses to the expected values") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8", out) == true);
  for (int i = 0; i < 8; i++) {
    CHECK(out[i] == doctest::Approx((float)(i + 1)));
  }
}

TEST_CASE("happy path: floating-point values with decimals and signs") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients(
            "1.5,-2.25,0.0,3.75e2,-0.001,1e-3,42,9.99", out) == true);
  CHECK(out[0] == doctest::Approx(1.5f));
  CHECK(out[1] == doctest::Approx(-2.25f));
  CHECK(out[2] == doctest::Approx(0.0f));
  CHECK(out[3] == doctest::Approx(375.0f));
  CHECK(out[4] == doctest::Approx(-0.001f));
  CHECK(out[5] == doctest::Approx(0.001f));
  CHECK(out[6] == doctest::Approx(42.0f));
  CHECK(out[7] == doctest::Approx(9.99f));
}

TEST_CASE("happy path: all zeros are allowed (degenerate calibration but valid input)") {
  float out[8] = {1};
  CHECK(parse_perspective_coefficients("0,0,0,0,0,0,0,0", out) == true);
  for (int i = 0; i < 8; i++) CHECK(out[i] == 0.0f);
}

TEST_CASE("rejects: too few coefficients") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,2,3,4,5", out) == false);
  CHECK(parse_perspective_coefficients("", out) == false);
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7", out) == false);
}

TEST_CASE("rejects: too many coefficients (9th present)") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8,9", out) == false);
}

TEST_CASE("rejects: trailing garbage after eighth float") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8,garbage", out) == false);
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8x", out) == false);
}

TEST_CASE("trailing whitespace after the last float is OK") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8 ", out) == true);
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8\n", out) == true);
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8\t", out) == true);
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8 \t\n ", out) == true);
}

TEST_CASE("rejects: double commas (empty field in the middle)") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,,2,3,4,5,6,7,8", out) == false);
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,,7,8", out) == false);
}

TEST_CASE("rejects: leading comma (empty first field)") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients(",1,2,3,4,5,6,7,8", out) == false);
}

TEST_CASE("rejects: trailing comma (would be a 9th empty field)") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,8,", out) == false);
}

TEST_CASE("rejects: NaN coefficient via the literal nan token") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,nan", out) == false);
}

TEST_CASE("rejects: infinite coefficient (literal inf)") {
  float out[8] = {0};
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,inf", out) == false);
  CHECK(parse_perspective_coefficients("1,2,3,4,5,6,7,-inf", out) == false);
}

TEST_CASE("rejects: overflow to infinity via 1e9999 literal") {
  // strtof returns +/-HUGE_VALF (== infinity for float) when the literal
  // overflows. Make sure that path is caught.
  float out[8] = {0};
  CHECK(parse_perspective_coefficients(
            "1,2,3,4,5,6,7,1e9999", out) == false);
}

TEST_CASE("whitespace between values is treated as part of strtof skip") {
  // strtof skips leading whitespace, so " 2" parses fine. We allow spaces
  // around the comma separator.
  float out[8] = {0};
  CHECK(parse_perspective_coefficients(
            "1, 2, 3, 4, 5, 6, 7, 8", out) == true);
  for (int i = 0; i < 8; i++) {
    CHECK(out[i] == doctest::Approx((float)(i + 1)));
  }
}
