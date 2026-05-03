#pragma once

#include "epp_window.h"  // TargetInput, WindowOutput, TargetWindow

namespace epp {

class RollingWindow {
public:
    static constexpr int MAX_FRAMES = 16;

    explicit RollingWindow(uint32_t window_ms = 1000);

    /// Feed a frame with its timestamp (ms). Expires frames older than window_ms.
    /// Assumes monotonic timestamps. If `timestamp_ms` is older than any frame
    /// already in the buffer (clock reset / restart), the buffer is reset and
    /// the new frame becomes the new tail — leaving disordered frames behind a
    /// no-longer-monotonic tail would silently break later in-order expiry.
    void feed(const TargetInput targets[], int target_count, uint32_t timestamp_ms);

    /// Compute current output (median of frames within window).
    /// Always valid after at least one feed() call.
    WindowOutput output() const;

    void set_window_duration(uint32_t ms) { window_ms_ = ms; }
    void reset();

private:
    struct Frame {
        TargetInput targets[MAX_TARGETS];
        uint32_t timestamp_ms;
    };

    uint32_t window_ms_;
    Frame frames_[MAX_FRAMES];
    int head_ = 0;
    int count_ = 0;

    void expire_old(uint32_t now_ms);
};

}  // namespace epp
