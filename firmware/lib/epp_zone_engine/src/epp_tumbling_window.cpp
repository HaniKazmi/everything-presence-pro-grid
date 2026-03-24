#include "epp_tumbling_window.h"

namespace epp {

TumblingWindow::TumblingWindow(float interval_s)
    : interval_s_(interval_s) {}

void TumblingWindow::reset() {
    started_ = false;
    window_start_ = 0.0f;
    frame_count_ = 0;
    for (int i = 0; i < MAX_TARGETS; ++i) {
        accum_[i].count = 0;
    }
    output_ = WindowOutput{};
}

bool TumblingWindow::feed(const TargetInput targets[], int target_count,
                          float timestamp) {
    if (!started_) {
        started_ = true;
        window_start_ = timestamp;
    }

    if (timestamp - window_start_ >= interval_s_) {
        emit();
        window_start_ = timestamp;
        accumulate(targets, target_count);
        return true;
    }

    accumulate(targets, target_count);
    return false;
}

void TumblingWindow::accumulate(const TargetInput targets[], int target_count) {
    frame_count_++;
    int n = std::min(target_count, MAX_TARGETS);
    for (int i = 0; i < n; ++i) {
        if (!targets[i].active) continue;
        auto& acc = accum_[i];
        if (acc.count < RAW_FPS + 2) {
            acc.xs[acc.count] = targets[i].x;
            acc.ys[acc.count] = targets[i].y;
            acc.count++;
        }
    }
}

void TumblingWindow::emit() {
    for (int i = 0; i < MAX_TARGETS; ++i) {
        auto& acc = accum_[i];
        if (acc.count > 0) {
            output_.targets[i].median_x = compute_median(acc.xs, acc.count);
            output_.targets[i].median_y = compute_median(acc.ys, acc.count);
            output_.targets[i].frame_count = acc.count;
            output_.targets[i].active = true;
        } else {
            output_.targets[i] = TargetWindow{};
        }
    }
    output_.total_frames = frame_count_;

    // Reset accumulators
    frame_count_ = 0;
    for (int i = 0; i < MAX_TARGETS; ++i) {
        accum_[i].count = 0;
    }
}

}  // namespace epp
