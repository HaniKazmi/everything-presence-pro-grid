#pragma once

#include <cstdint>
#include <utility>

namespace epp {

class SensorTransform {
public:
    SensorTransform() = default;

    /// Set the 8 perspective coefficients and room dimensions.
    void set_coefficients(const float coeffs[8], float room_width, float room_depth);

    /// Returns true if perspective coefficients have been set.
    bool has_perspective() const;

    /// Apply the perspective transform to (x, y).
    ///
    /// Returns the input unchanged when no perspective is set or the denominator
    /// is near zero. Returns (NaN, NaN) when either input is non-finite — the
    /// caller is expected to treat that as "skip this sample" so a malformed
    /// frame can't fold into a valid grid cell.
    std::pair<float, float> apply(float x, float y) const;

    float room_width() const { return room_width_; }
    float room_depth() const { return room_depth_; }

private:
    float coeffs_[8]{};
    float room_width_ = 0.0f;
    float room_depth_ = 0.0f;
    bool has_perspective_ = false;
};

}  // namespace epp
