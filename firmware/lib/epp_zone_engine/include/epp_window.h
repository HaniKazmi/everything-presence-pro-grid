#pragma once

#include "epp_types.h"

namespace epp {

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

}  // namespace epp
