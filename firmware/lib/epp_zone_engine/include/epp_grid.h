#pragma once

#include "epp_types.h"

#include <array>
#include <cstdint>

namespace epp {

class Grid {
public:
    Grid(float origin_x = 0.0f, float origin_y = 0.0f,
         int cols = GRID_COLS, int rows = GRID_ROWS,
         int cell_size = GRID_CELL_SIZE_MM);

    /// Map world coordinates to a cell index. Returns -1 if outside the grid.
    int xy_to_cell(float x, float y) const;

    /// Extract the zone number (0-7) from a cell byte.
    int cell_zone(int cell_index) const;

    /// Check if a cell is marked as room (bit 0).
    bool cell_is_room(int cell_index) const;

    /// Load cell data from a byte buffer.
    void load_from_bytes(const uint8_t* data, int len);

    // Accessors
    float origin_x() const { return origin_x_; }
    float origin_y() const { return origin_y_; }
    int cols() const { return cols_; }
    int rows() const { return rows_; }
    int cell_size() const { return cell_size_; }
    int cell_count() const { return cols_ * rows_; }
    uint8_t& cell(int index) { return cells_[index]; }
    const uint8_t& cell(int index) const { return cells_[index]; }

private:
    std::array<uint8_t, GRID_CELL_COUNT> cells_{};
    float origin_x_;
    float origin_y_;
    int cols_;
    int rows_;
    int cell_size_;
};

}  // namespace epp
