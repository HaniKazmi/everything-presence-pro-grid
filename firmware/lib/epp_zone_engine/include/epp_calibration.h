#pragma once

#include "epp_types.h"
#include <array>

namespace epp {

class SensorTransform {
public:
    SensorTransform() = default;
    // Placeholder — will be implemented in Phase 2

private:
    std::array<float, 8> coeffs_{};
    float room_width_ = 0.0f;
    float room_depth_ = 0.0f;
};

}  // namespace epp
