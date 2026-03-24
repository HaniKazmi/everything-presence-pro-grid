#pragma once

#include "epp_types.h"

namespace epp {

class Grid {
public:
    Grid() = default;

    // Placeholder — will be implemented in Phase 2
    int xy_to_cell(float x, float y) const;

private:
    std::array<uint8_t, GRID_CELL_COUNT> cells_{};
    float origin_x_ = 0.0f;
    float origin_y_ = 0.0f;
};

}  // namespace epp
