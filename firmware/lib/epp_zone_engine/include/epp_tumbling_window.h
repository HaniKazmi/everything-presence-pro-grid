#pragma once

#include <algorithm>
#include <cstring>

#include "epp_types.h"

namespace epp {

// --- Data structures ---

struct TargetInput {
    float x;
    float y;
    bool active;
};

struct TargetWindow {
    float median_x = 0.0f;
    float median_y = 0.0f;
    int frame_count = 0;
    bool active = false;
    bool on_overlay = false;  // raw frame touched an overlay cell recently
};

struct WindowOutput {
    TargetWindow targets[MAX_TARGETS];
    int total_frames = 0;
};

// --- Median (stack-allocated, no heap) ---

inline float compute_median(const float* data, int count) {
    if (count <= 0) return 0.0f;
    if (count == 1) return data[0];
    float buf[RAW_FPS + 2];
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

// --- TumblingWindow ---

class TumblingWindow {
public:
    explicit TumblingWindow(float interval_s = 1.0f);

    /// Feed a frame. Returns true if the window ticked (output is valid).
    bool feed(const TargetInput targets[], int target_count, float timestamp);

    const WindowOutput& output() const { return output_; }
    void reset();

private:
    void accumulate(const TargetInput targets[], int target_count);
    void emit();

    struct TargetAccumulator {
        float xs[RAW_FPS + 2];  // +2 for safety margin
        float ys[RAW_FPS + 2];
        int count = 0;
    };

    float interval_s_;
    float window_start_ = 0.0f;
    bool started_ = false;
    int frame_count_ = 0;
    TargetAccumulator accum_[MAX_TARGETS]{};
    WindowOutput output_{};
};

}  // namespace epp
