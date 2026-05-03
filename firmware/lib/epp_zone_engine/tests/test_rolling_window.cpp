#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_rolling_window.h"

using namespace epp;

// Helper: build a single-target frame
static void make_frame(TargetInput out[], float x, float y, bool active) {
    out[0] = {x, y, active};
    out[1] = {0.0f, 0.0f, false};
    out[2] = {0.0f, 0.0f, false};
}

// TEST 1: Single frame → correct output
TEST_CASE("single frame produces correct output") {
    RollingWindow rw;

    TargetInput frame[MAX_TARGETS];
    make_frame(frame, 100.0f, 200.0f, true);
    rw.feed(frame, MAX_TARGETS, 0);

    auto out = rw.output();
    CHECK(out.targets[0].active);
    CHECK(out.targets[0].median_x == doctest::Approx(100.0f));
    CHECK(out.targets[0].median_y == doctest::Approx(200.0f));
    CHECK(out.targets[0].frame_count == 1);
    CHECK(out.total_frames == 1);
}

// TEST 2: Multiple frames within window → correct median
TEST_CASE("multiple frames within window produce correct median") {
    RollingWindow rw;

    // Feed 5 frames at 100ms intervals: x = 1,2,3,4,5 → median = 3
    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, static_cast<float>(i + 1), 10.0f, true);
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 100));
    }

    auto out = rw.output();
    CHECK(out.targets[0].active);
    CHECK(out.targets[0].median_x == doctest::Approx(3.0f));
    CHECK(out.targets[0].median_y == doctest::Approx(10.0f));
    CHECK(out.targets[0].frame_count == 5);
    CHECK(out.total_frames == 5);
}

// TEST 3: Time-based expiry
TEST_CASE("frames older than window_ms are expired") {
    RollingWindow rw;

    // Feed frames at 0, 100, 200, 300, 400, 500, 600, 700, 800, 900 ms
    for (int i = 0; i < 10; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, static_cast<float>(i), 0.0f, true);
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 100));
    }

    // Now feed at 1500ms — frames before 500ms should be expired
    // (1500 - timestamp > 1000 → timestamp < 500)
    // Frames at 0,100,200,300,400 (x=0,1,2,3,4) are expired
    // Frames at 500,600,700,800,900 (x=5,6,7,8,9) remain — 5 frames
    TargetInput late_frame[MAX_TARGETS];
    make_frame(late_frame, 99.0f, 0.0f, true);
    rw.feed(late_frame, MAX_TARGETS, 1500);

    auto out = rw.output();
    // 5 old frames (500-900ms) + 1 new frame (1500ms) = 6 frames
    CHECK(out.total_frames == 6);
    // Remaining x values: 5,6,7,8,9,99 — median of sorted [5,6,7,8,9,99] = (7+8)/2 = 7.5
    CHECK(out.targets[0].median_x == doctest::Approx(7.5f));
}

// TEST 4: Median computation [1,3,5,2,4] → median_x = 3.0
TEST_CASE("unsorted frame values produce correct median") {
    RollingWindow rw;

    float xs[] = {1.0f, 3.0f, 5.0f, 2.0f, 4.0f};
    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, xs[i], 10.0f, true);
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 100));
    }

    auto out = rw.output();
    CHECK(out.targets[0].median_x == doctest::Approx(3.0f));
}

// TEST 5: frame_count per target (target 0 always active, target 1 only even frames)
TEST_CASE("frame_count tracks active frames per target") {
    RollingWindow rw;

    for (int i = 0; i < 6; ++i) {
        TargetInput frame[MAX_TARGETS] = {
            {50.0f, 50.0f, true},
            {80.0f, 80.0f, (i % 2 == 0)},
            {0.0f, 0.0f, false},
        };
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 100));
    }

    auto out = rw.output();
    CHECK(out.targets[0].frame_count == 6);
    CHECK(out.targets[1].frame_count == 3);  // frames 0, 2, 4
    CHECK(out.total_frames == 6);
}

// TEST 6: total_frames counts all frames regardless of activity
TEST_CASE("total_frames counts all frames regardless of target activity") {
    RollingWindow rw;

    for (int i = 0; i < 8; ++i) {
        TargetInput frame[MAX_TARGETS];
        // Alternate active/inactive
        make_frame(frame, 100.0f, 200.0f, (i % 2 == 0));
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 50));
    }

    auto out = rw.output();
    CHECK(out.total_frames == 8);
}

// TEST 7: Empty window (output before any feed) → all inactive
TEST_CASE("output before any feed returns all inactive targets") {
    RollingWindow rw;

    auto out = rw.output();
    for (int i = 0; i < MAX_TARGETS; ++i) {
        CHECK_FALSE(out.targets[i].active);
        CHECK(out.targets[i].frame_count == 0);
    }
    CHECK(out.total_frames == 0);
}

// TEST 8: Variable frame rates
TEST_CASE("variable frame rates accumulate correctly within window") {
    RollingWindow rw;

    // Irregular intervals: 0, 80, 200, 290, 400 ms
    uint32_t timestamps[] = {0, 80, 200, 290, 400};
    float xs[] = {10.0f, 20.0f, 30.0f, 40.0f, 50.0f};

    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, xs[i], 5.0f, true);
        rw.feed(frame, MAX_TARGETS, timestamps[i]);
    }

    auto out = rw.output();
    CHECK(out.total_frames == 5);
    // All 5 frames within 1000ms window; sorted xs: 10,20,30,40,50 → median = 30
    CHECK(out.targets[0].median_x == doctest::Approx(30.0f));
}

// TEST 9: Window duration is fixed at 1000ms — frames older than 1s expire
TEST_CASE("rolling window expires frames older than 1000ms") {
    RollingWindow rw;

    // Feed frames at 0, 200, 400, 600, 800 ms
    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, static_cast<float>(i + 1), 0.0f, true);
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 200));
    }

    // All 5 frames within 1000ms
    CHECK(rw.output().total_frames == 5);

    // Feed at 1100ms — frames before 100ms expire
    // (1100 - 0 = 1100 > 1000 → frame at 0ms expires)
    // Frames at 200,400,600,800 remain plus the new one at 1100
    TargetInput frame[MAX_TARGETS];
    make_frame(frame, 6.0f, 0.0f, true);
    rw.feed(frame, MAX_TARGETS, 1100);

    auto out = rw.output();
    CHECK(out.total_frames == 5);
}

// TEST 10: Buffer overflow (> MAX_FRAMES frames within window, oldest dropped)
TEST_CASE("buffer overflow drops oldest frames and output remains valid") {
    RollingWindow rw;

    // Feed 20 frames at 50ms intervals — span 950ms, all within the 1000ms
    // window so the buffer-size limit (MAX_FRAMES=16) is what discards the
    // oldest frames, not time-based expiry.
    constexpr int OVERFLOW_COUNT = 20;
    for (int i = 0; i < OVERFLOW_COUNT; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, static_cast<float>(i + 1), 0.0f, true);
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 50));
    }

    auto out = rw.output();
    // Buffer holds at most MAX_FRAMES=16 frames
    CHECK(out.total_frames == 16);
    CHECK(out.targets[0].active);
    // Last 16 frames: x = 5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20
    // Sorted median of 16 values: (12+13)/2 = 12.5
    CHECK(out.targets[0].median_x == doctest::Approx(12.5f));
}

// TEST 11: Inactive targets don't affect median or frame_count
TEST_CASE("inactive targets do not contribute to median or frame_count") {
    RollingWindow rw;

    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS] = {
            {100.0f, 200.0f, true},
            {999.0f, 999.0f, false},
            {0.0f, 0.0f, false},
        };
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 100));
    }

    auto out = rw.output();
    CHECK(out.targets[0].active);
    CHECK(out.targets[0].frame_count == 5);
    CHECK(out.targets[0].median_x == doctest::Approx(100.0f));

    // Target 1 had no active frames
    CHECK_FALSE(out.targets[1].active);
    CHECK(out.targets[1].frame_count == 0);
}

// TEST 12: Reset clears state
TEST_CASE("reset clears all state") {
    RollingWindow rw;

    // Feed some frames
    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS];
        make_frame(frame, 100.0f, 200.0f, true);
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 100));
    }

    CHECK(rw.output().total_frames == 5);

    rw.reset();

    // After reset, output should be empty
    auto out = rw.output();
    CHECK(out.total_frames == 0);
    for (int i = 0; i < MAX_TARGETS; ++i) {
        CHECK_FALSE(out.targets[i].active);
        CHECK(out.targets[i].frame_count == 0);
    }

    // Feeding after reset should only reflect new data
    TargetInput frame[MAX_TARGETS];
    make_frame(frame, 300.0f, 400.0f, true);
    rw.feed(frame, MAX_TARGETS, 500);

    out = rw.output();
    CHECK(out.total_frames == 1);
    CHECK(out.targets[0].median_x == doctest::Approx(300.0f));
    CHECK(out.targets[0].median_y == doctest::Approx(400.0f));
}

// TEST 13: Empty frame (target_count=0) counts as a frame but no active targets
TEST_CASE("empty frame with target_count=0 counts as frame") {
    RollingWindow rw;

    TargetInput empty[MAX_TARGETS] = {};
    rw.feed(empty, 0, 0);

    auto out = rw.output();
    CHECK(out.total_frames == 1);
    for (int i = 0; i < MAX_TARGETS; ++i) {
        CHECK_FALSE(out.targets[i].active);
        CHECK(out.targets[i].frame_count == 0);
    }
}

// TEST 14: target_count > MAX_TARGETS is truncated
TEST_CASE("target_count greater than MAX_TARGETS is truncated") {
    RollingWindow rw;

    // Provide 5 targets but only first MAX_TARGETS should be stored
    TargetInput frame[5] = {
        {10.0f, 20.0f, true},
        {30.0f, 40.0f, true},
        {50.0f, 60.0f, true},
        {70.0f, 80.0f, true},   // should be ignored
        {90.0f, 100.0f, true},  // should be ignored
    };
    rw.feed(frame, 5, 0);

    auto out = rw.output();
    CHECK(out.total_frames == 1);
    CHECK(out.targets[0].active);
    CHECK(out.targets[0].median_x == doctest::Approx(10.0f));
    CHECK(out.targets[1].active);
    CHECK(out.targets[1].median_x == doctest::Approx(30.0f));
    CHECK(out.targets[2].active);
    CHECK(out.targets[2].median_x == doctest::Approx(50.0f));
}

// TEST 15: Multiple targets compute independent medians
TEST_CASE("multiple targets compute independent medians") {
    RollingWindow rw;

    for (int i = 0; i < 5; ++i) {
        TargetInput frame[MAX_TARGETS] = {
            {static_cast<float>(i * 10), 100.0f, true},
            {static_cast<float>(i * 100 + 500), 200.0f, true},
            {static_cast<float>(i * 2), 300.0f, (i % 2 == 0)},
        };
        rw.feed(frame, MAX_TARGETS, static_cast<uint32_t>(i * 100));
    }

    auto out = rw.output();
    // Target 0: x = 0,10,20,30,40 → median = 20
    CHECK(out.targets[0].median_x == doctest::Approx(20.0f));
    CHECK(out.targets[0].frame_count == 5);
    // Target 1: x = 500,600,700,800,900 → median = 700
    CHECK(out.targets[1].median_x == doctest::Approx(700.0f));
    CHECK(out.targets[1].frame_count == 5);
    // Target 2: active on frames 0,2,4 → x = 0,4,8 → median = 4
    CHECK(out.targets[2].median_x == doctest::Approx(4.0f));
    CHECK(out.targets[2].frame_count == 3);
}

// TEST 16: feed after full expiry starts fresh
TEST_CASE("feed after all frames expired starts fresh") {
    RollingWindow rw;

    TargetInput frame[MAX_TARGETS];
    make_frame(frame, 100.0f, 200.0f, true);
    rw.feed(frame, MAX_TARGETS, 0);
    rw.feed(frame, MAX_TARGETS, 100);

    CHECK(rw.output().total_frames == 2);

    // Feed well after window expires (5000ms - 100ms > 1000ms window)
    make_frame(frame, 999.0f, 888.0f, true);
    rw.feed(frame, MAX_TARGETS, 5000);

    auto out = rw.output();
    CHECK(out.total_frames == 1);
    CHECK(out.targets[0].median_x == doctest::Approx(999.0f));
}

// TEST 17: out-of-order timestamp resets the buffer (clock anomaly handling).
// The window assumes monotonic timestamps; the only time `now_ms < tail_ts`
// is on a clock reset / restart. Resetting the window is safer than leaving
// timestamp-disordered frames in the ring (which a later in-order feed would
// then fail to expire correctly).
TEST_CASE("out-of-order feed resets the window without underflow") {
    RollingWindow rw;

    TargetInput frame[MAX_TARGETS];
    make_frame(frame, 1.0f, 0.0f, true);
    rw.feed(frame, MAX_TARGETS, 5000);
    make_frame(frame, 2.0f, 0.0f, true);
    rw.feed(frame, MAX_TARGETS, 5500);
    CHECK(rw.output().total_frames == 2);

    // Earlier timestamp arrives — must NOT cause unsigned underflow that
    // silently drops valid frames. Treated as anomaly: ring resets and the
    // new frame becomes the new tail.
    make_frame(frame, 3.0f, 0.0f, true);
    rw.feed(frame, MAX_TARGETS, 4000);
    CHECK(rw.output().total_frames == 1);

    // Subsequent in-order feeds work normally and don't leave stale frames
    // behind a no-longer-monotonic tail (the regression path Copilot flagged).
    make_frame(frame, 4.0f, 0.0f, true);
    rw.feed(frame, MAX_TARGETS, 6000);
    auto out = rw.output();
    // 6000-1000=5000; only the 4000ms frame is older, but it was reset above
    // and the only remaining frame is at 6000ms.
    CHECK(out.total_frames == 1);
    CHECK(out.targets[0].median_x == doctest::Approx(4.0f));
}
