#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_tumbling_window.h"

using namespace epp;

// Helper: build a single-target frame
static void make_frame(TargetInput out[], float x, float y, bool active) {
    out[0] = {x, y, active};
    out[1] = {0.0f, 0.0f, false};
    out[2] = {0.0f, 0.0f, false};
}

TEST_CASE("feeding frames within 1s does not emit") {
    TumblingWindow tw;

    TargetInput frame[MAX_TARGETS];
    make_frame(frame, 100.0f, 200.0f, true);

    // Feed several frames all within the first second
    for (int i = 0; i < 9; ++i) {
        float t = i * 0.1f;
        CHECK_FALSE(tw.feed(frame, MAX_TARGETS, t));
    }
}

TEST_CASE("feeding frame at 1s emits") {
    TumblingWindow tw;

    TargetInput frame[MAX_TARGETS];
    make_frame(frame, 100.0f, 200.0f, true);

    // Fill a window
    for (int i = 0; i < 10; ++i) {
        tw.feed(frame, MAX_TARGETS, i * 0.1f);
    }

    // Frame at t=1.0 should trigger emit
    CHECK(tw.feed(frame, MAX_TARGETS, 1.0f));
}

TEST_CASE("output has correct median positions") {
    TumblingWindow tw;

    // Feed 5 frames with different x values: 1, 2, 3, 4, 5 -> median = 3
    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, static_cast<float>(i + 1), 10.0f, true);
        tw.feed(frame, MAX_TARGETS, i * 0.1f);
    }

    // Trigger emit
    TargetInput trigger[MAX_TARGETS];
    make_frame(trigger, 99.0f, 99.0f, true);
    bool emitted = tw.feed(trigger, MAX_TARGETS, 1.0f);
    REQUIRE(emitted);

    const auto& out = tw.output();
    CHECK(out.targets[0].active);
    CHECK(out.targets[0].median_x == doctest::Approx(3.0f));
    CHECK(out.targets[0].median_y == doctest::Approx(10.0f));
    CHECK(out.targets[0].frame_count == 5);
    CHECK(out.total_frames == 5);
}

TEST_CASE("inactive targets do not contribute") {
    TumblingWindow tw;

    // Feed frames where target 0 is active, target 1 is inactive
    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS] = {
            {100.0f, 200.0f, true},
            {999.0f, 999.0f, false},
            {0.0f, 0.0f, false},
        };
        tw.feed(frame, MAX_TARGETS, i * 0.1f);
    }

    TargetInput trigger[MAX_TARGETS];
    make_frame(trigger, 0.0f, 0.0f, false);
    bool emitted = tw.feed(trigger, MAX_TARGETS, 1.0f);
    REQUIRE(emitted);

    const auto& out = tw.output();
    CHECK(out.targets[0].active);
    CHECK(out.targets[0].frame_count == 5);

    // Target 1 had no active frames
    CHECK_FALSE(out.targets[1].active);
    CHECK(out.targets[1].frame_count == 0);
}

TEST_CASE("frame count reflects active frames per target") {
    TumblingWindow tw;

    // Target 0 active every frame, target 1 active only on even frames
    for (int i = 0; i < 6; ++i) {
        TargetInput frame[MAX_TARGETS] = {
            {50.0f, 50.0f, true},
            {80.0f, 80.0f, (i % 2 == 0)},
            {0.0f, 0.0f, false},
        };
        tw.feed(frame, MAX_TARGETS, i * 0.1f);
    }

    TargetInput trigger[MAX_TARGETS];
    make_frame(trigger, 0.0f, 0.0f, false);
    bool emitted = tw.feed(trigger, MAX_TARGETS, 1.0f);
    REQUIRE(emitted);

    const auto& out = tw.output();
    CHECK(out.targets[0].frame_count == 6);
    CHECK(out.targets[1].frame_count == 3);  // frames 0, 2, 4
    CHECK(out.total_frames == 6);
}

TEST_CASE("multiple targets accumulate independently") {
    TumblingWindow tw;

    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS] = {
            {10.0f, 20.0f, true},
            {30.0f, 40.0f, true},
            {50.0f, 60.0f, true},
        };
        tw.feed(frame, MAX_TARGETS, i * 0.1f);
    }

    TargetInput trigger[MAX_TARGETS];
    make_frame(trigger, 0.0f, 0.0f, false);
    bool emitted = tw.feed(trigger, MAX_TARGETS, 1.0f);
    REQUIRE(emitted);

    const auto& out = tw.output();
    CHECK(out.targets[0].median_x == doctest::Approx(10.0f));
    CHECK(out.targets[0].median_y == doctest::Approx(20.0f));
    CHECK(out.targets[1].median_x == doctest::Approx(30.0f));
    CHECK(out.targets[1].median_y == doctest::Approx(40.0f));
    CHECK(out.targets[2].median_x == doctest::Approx(50.0f));
    CHECK(out.targets[2].median_y == doctest::Approx(60.0f));

    for (int i = 0; i < MAX_TARGETS; ++i) {
        CHECK(out.targets[i].active);
        CHECK(out.targets[i].frame_count == 5);
    }
}

TEST_CASE("window resets after emit") {
    TumblingWindow tw;

    // First window
    for (int i = 0; i < 10; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, 100.0f, 200.0f, true);
        tw.feed(frame, MAX_TARGETS, i * 0.1f);
    }

    // Emit first window
    TargetInput trigger[MAX_TARGETS];
    make_frame(trigger, 500.0f, 600.0f, true);
    bool emitted = tw.feed(trigger, MAX_TARGETS, 1.0f);
    REQUIRE(emitted);

    const auto& out1 = tw.output();
    CHECK(out1.targets[0].median_x == doctest::Approx(100.0f));
    CHECK(out1.total_frames == 10);

    // Second window — feed different values
    for (int i = 1; i < 10; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, 500.0f, 600.0f, true);
        tw.feed(frame, MAX_TARGETS, 1.0f + i * 0.1f);
    }

    // Emit second window
    TargetInput trigger2[MAX_TARGETS];
    make_frame(trigger2, 0.0f, 0.0f, false);
    emitted = tw.feed(trigger2, MAX_TARGETS, 2.0f);
    REQUIRE(emitted);

    const auto& out2 = tw.output();
    // The trigger at 1.0 contributed 500.0f to this window,
    // plus 9 more frames of 500.0f => all 500.0f
    CHECK(out2.targets[0].median_x == doctest::Approx(500.0f));
    CHECK(out2.total_frames == 10);
}

TEST_CASE("even-length median matches Python (average of two middle)") {
    // Python: statistics.median([1, 2, 3, 4]) == 2.5
    float data4[] = {1.0f, 2.0f, 3.0f, 4.0f};
    CHECK(compute_median(data4, 4) == doctest::Approx(2.5f));

    // Python: statistics.median([10, 20]) == 15.0
    float data2[] = {10.0f, 20.0f};
    CHECK(compute_median(data2, 2) == doctest::Approx(15.0f));

    // Python: statistics.median([1, 3, 5, 7, 9, 11]) == 6.0
    float data6[] = {1.0f, 3.0f, 5.0f, 7.0f, 9.0f, 11.0f};
    CHECK(compute_median(data6, 6) == doctest::Approx(6.0f));

    // Odd-length: statistics.median([1, 3, 5]) == 3.0
    float data3[] = {1.0f, 3.0f, 5.0f};
    CHECK(compute_median(data3, 3) == doctest::Approx(3.0f));

    // Unsorted input: statistics.median([5, 1, 3, 2, 4]) == 3.0
    float unsorted[] = {5.0f, 1.0f, 3.0f, 2.0f, 4.0f};
    CHECK(compute_median(unsorted, 5) == doctest::Approx(3.0f));

    // Single element
    float single[] = {42.0f};
    CHECK(compute_median(single, 1) == doctest::Approx(42.0f));

    // Empty
    CHECK(compute_median(nullptr, 0) == doctest::Approx(0.0f));
}

TEST_CASE("manual reset clears state") {
    TumblingWindow tw;

    TargetInput frame[MAX_TARGETS];
    make_frame(frame, 100.0f, 200.0f, true);

    for (int i = 0; i < 5; ++i) {
        tw.feed(frame, MAX_TARGETS, i * 0.1f);
    }

    tw.reset();

    // After reset, feeding at t=0.5 should not emit (window restarts)
    CHECK_FALSE(tw.feed(frame, MAX_TARGETS, 0.5f));

    // Feed more frames and emit
    for (int i = 1; i < 5; ++i) {
        TargetInput f[MAX_TARGETS];
        make_frame(f, 300.0f, 400.0f, true);
        tw.feed(f, MAX_TARGETS, 0.5f + i * 0.1f);
    }

    TargetInput trigger[MAX_TARGETS];
    make_frame(trigger, 300.0f, 400.0f, true);
    bool emitted = tw.feed(trigger, MAX_TARGETS, 1.5f);
    REQUIRE(emitted);

    const auto& out = tw.output();
    // Should only reflect post-reset data (300, 400)
    CHECK(out.targets[0].median_x == doctest::Approx(300.0f));
    CHECK(out.targets[0].median_y == doctest::Approx(400.0f));
}
