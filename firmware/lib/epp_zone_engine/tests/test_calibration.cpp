#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_calibration.h"

#include <cmath>

TEST_CASE("no perspective set returns input unchanged") {
    epp::SensorTransform transform;
    auto [rx, ry] = transform.apply(100.0f, 200.0f);
    CHECK(rx == 100.0f);
    CHECK(ry == 200.0f);
}

TEST_CASE("has_perspective is false initially, true after set_coefficients") {
    epp::SensorTransform transform;
    CHECK_FALSE(transform.has_perspective());

    // Identity-like coefficients: a=1, e=1, others=0
    // rx = (1*x + 0*y + 0) / (0*x + 0*y + 1) = x
    // ry = (0*x + 1*y + 0) / (0*x + 0*y + 1) = y
    float coeffs[8] = {1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f};
    transform.set_coefficients(coeffs, 6000.0f, 6000.0f);
    CHECK(transform.has_perspective());
}

TEST_CASE("identity coefficients return input unchanged") {
    epp::SensorTransform transform;
    float coeffs[8] = {1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f};
    transform.set_coefficients(coeffs, 6000.0f, 6000.0f);

    auto [rx, ry] = transform.apply(1500.0f, 3000.0f);
    CHECK(rx == doctest::Approx(1500.0f));
    CHECK(ry == doctest::Approx(3000.0f));
}

TEST_CASE("known coefficients produce expected output") {
    epp::SensorTransform transform;
    // Simple scaling: a=2, e=3, c=100, f=200, others=0
    // rx = (2*x + 0*y + 100) / 1
    // ry = (0*x + 3*y + 200) / 1
    float coeffs[8] = {2.0f, 0.0f, 100.0f, 0.0f, 3.0f, 200.0f, 0.0f, 0.0f};
    transform.set_coefficients(coeffs, 6000.0f, 6000.0f);

    auto [rx, ry] = transform.apply(50.0f, 100.0f);
    CHECK(rx == doctest::Approx(200.0f));   // 2*50 + 100
    CHECK(ry == doctest::Approx(500.0f));   // 3*100 + 200
}

TEST_CASE("perspective with non-zero g and h") {
    epp::SensorTransform transform;
    // a=1, b=0, c=0, d=0, e=1, f=0, g=0.001, h=0
    // denom = 0.001*x + 0 + 1
    // For x=1000: denom=2, rx=1000/2=500, ry=y/2
    float coeffs[8] = {1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.001f, 0.0f};
    transform.set_coefficients(coeffs, 6000.0f, 6000.0f);

    auto [rx, ry] = transform.apply(1000.0f, 400.0f);
    CHECK(rx == doctest::Approx(500.0f));
    CHECK(ry == doctest::Approx(200.0f));
}

TEST_CASE("near-zero denominator returns input unchanged") {
    epp::SensorTransform transform;
    // g=-1, h=0: denom = -x + 1
    // When x=1: denom = 0 -> safety fallback
    float coeffs[8] = {1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, -1.0f, 0.0f};
    transform.set_coefficients(coeffs, 6000.0f, 6000.0f);

    auto [rx, ry] = transform.apply(1.0f, 500.0f);
    CHECK(rx == 1.0f);
    CHECK(ry == 500.0f);
}

TEST_CASE("room dimensions are stored") {
    epp::SensorTransform transform;
    float coeffs[8] = {1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f};
    transform.set_coefficients(coeffs, 4500.0f, 3000.0f);

    CHECK(transform.room_width() == 4500.0f);
    CHECK(transform.room_depth() == 3000.0f);
}
