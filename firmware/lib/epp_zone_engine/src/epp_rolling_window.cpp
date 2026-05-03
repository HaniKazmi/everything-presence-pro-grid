#include "epp_rolling_window.h"

#include <algorithm>
#include <cstring>

namespace epp {

namespace {

static float rolling_median(const float* data, int count) {
    if (count <= 0) return 0.0f;
    if (count == 1) return data[0];
    float buf[RollingWindow::MAX_FRAMES];
    std::copy(data, data + count, buf);
    int mid = count / 2;
    std::nth_element(buf, buf + mid, buf + count);
    if (count % 2 == 0) {
        float upper = buf[mid];
        std::nth_element(buf, buf + mid - 1, buf + count);
        return (buf[mid - 1] + upper) / 2.0f;
    }
    return buf[mid];
}

}  // namespace

void RollingWindow::reset() {
    head_ = 0;
    count_ = 0;
}

void RollingWindow::expire_old(uint32_t now_ms) {
    // The window assumes monotonic timestamps. If `now_ms` is older than any
    // frame in the buffer, the caller's clock has gone backwards (restart /
    // reset). The buffer's monotonic ordering is no longer meaningful, so
    // discard everything and start fresh — this is safer than leaving
    // disordered frames behind a no-longer-monotonic tail (which a later
    // in-order feed would then fail to expire correctly).
    while (count_ > 0) {
        int tail = (head_ - count_ + MAX_FRAMES) % MAX_FRAMES;
        uint32_t tail_ts = frames_[tail].timestamp_ms;
        if (now_ms < tail_ts) {
            count_ = 0;
            head_ = 0;
            return;
        }
        if (now_ms - tail_ts > WINDOW_MS) {
            --count_;
        } else {
            break;
        }
    }
}

void RollingWindow::feed(const TargetInput targets[], int target_count, uint32_t timestamp_ms) {
    expire_old(timestamp_ms);

    // Copy frame into circular buffer
    int n = std::min(target_count, MAX_TARGETS);
    for (int i = 0; i < n; ++i) {
        frames_[head_].targets[i] = targets[i];
    }
    // Zero any remaining slots
    for (int i = n; i < MAX_TARGETS; ++i) {
        frames_[head_].targets[i] = {0.0f, 0.0f, false};
    }
    frames_[head_].timestamp_ms = timestamp_ms;

    head_ = (head_ + 1) % MAX_FRAMES;
    if (count_ < MAX_FRAMES) {
        ++count_;
    }
    // If count_ was already MAX_FRAMES, the oldest frame is implicitly overwritten
    // (head_ advanced past it), so count_ stays at MAX_FRAMES
}

WindowOutput RollingWindow::output() const {
    WindowOutput out{};
    out.total_frames = count_;

    if (count_ == 0) {
        return out;
    }

    // Per-target accumulators (stack-allocated, sized for MAX_FRAMES).
    float xs[MAX_TARGETS][MAX_FRAMES];
    float ys[MAX_TARGETS][MAX_FRAMES];
    int per_target_count[MAX_TARGETS] = {};

    int tail = (head_ - count_ + MAX_FRAMES) % MAX_FRAMES;
    for (int f = 0; f < count_; ++f) {
        int idx = (tail + f) % MAX_FRAMES;
        for (int t = 0; t < MAX_TARGETS; ++t) {
            if (frames_[idx].targets[t].active) {
                int c = per_target_count[t];
                if (c < MAX_FRAMES) {
                    xs[t][c] = frames_[idx].targets[t].x;
                    ys[t][c] = frames_[idx].targets[t].y;
                    per_target_count[t]++;
                }
            }
        }
    }

    for (int t = 0; t < MAX_TARGETS; ++t) {
        int c = per_target_count[t];
        if (c > 0) {
            out.targets[t].median_x = rolling_median(xs[t], c);
            out.targets[t].median_y = rolling_median(ys[t], c);
            out.targets[t].frame_count = c;
            out.targets[t].active = true;
        }
    }

    return out;
}

}  // namespace epp
