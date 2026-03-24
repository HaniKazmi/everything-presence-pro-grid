#include "epp_calibration.h"

#include <cmath>

namespace epp {

void SensorTransform::set_coefficients(const float coeffs[8], float room_width, float room_depth) {
    for (int i = 0; i < 8; ++i) {
        coeffs_[i] = coeffs[i];
    }
    room_width_ = room_width;
    room_depth_ = room_depth;
    has_perspective_ = true;
}

bool SensorTransform::has_perspective() const {
    return has_perspective_;
}

std::pair<float, float> SensorTransform::apply(float x, float y) const {
    if (!has_perspective_) {
        return {x, y};
    }

    float a = coeffs_[0], b = coeffs_[1], c = coeffs_[2];
    float d = coeffs_[3], e = coeffs_[4], f = coeffs_[5];
    float g = coeffs_[6], h = coeffs_[7];

    float denom = g * x + h * y + 1.0f;
    if (std::fabs(denom) < 1e-10f) {
        return {x, y};
    }

    float rx = (a * x + b * y + c) / denom;
    float ry = (d * x + e * y + f) / denom;
    return {rx, ry};
}

}  // namespace epp
