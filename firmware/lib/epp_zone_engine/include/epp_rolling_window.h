#pragma once

#include "epp_window.h"  // TargetInput, WindowOutput, TargetWindow

namespace epp {

/// Fixed-duration rolling window. The signal scale (0–9) is computed against
/// CANONICAL_FRAMES = 10 frames per 1000ms, so the window duration is fixed
/// to 1000ms and is not user-configurable.
class RollingWindow {
public:
    static constexpr int MAX_FRAMES = 16;
    static constexpr uint32_t WINDOW_MS = 1000;

    RollingWindow() = default;

    /// Feed a frame with its timestamp (ms). Expires frames older than WINDOW_MS.
    /// Assumes monotonic timestamps. If `timestamp_ms` is older than any frame
    /// already in the buffer (clock reset / restart), the buffer is reset and
    /// the new frame becomes the new tail — leaving disordered frames behind a
    /// no-longer-monotonic tail would silently break later in-order expiry.
    void feed(const TargetInput targets[], int target_count, uint32_t timestamp_ms);

    /// Compute current output (median of frames within window).
    /// Always valid after at least one feed() call.
    WindowOutput output() const;

    void reset();

private:
    struct Frame {
        TargetInput targets[MAX_TARGETS];
        uint32_t timestamp_ms;
    };

    Frame frames_[MAX_FRAMES];
    int head_ = 0;
    int count_ = 0;

    void expire_old(uint32_t now_ms);
};

}  // namespace epp
