#include "epp_grid.h"

#include <algorithm>
#include <cmath>

namespace epp {

Grid::Grid(float origin_x, float origin_y, int cols, int rows, int cell_size)
    : origin_x_(origin_x),
      origin_y_(origin_y),
      cols_(cols),
      rows_(rows),
      cell_size_(cell_size) {
    cells_.fill(0);
}

bool Grid::xy_to_col_row(float x, float y, int &col, int &row) const {
    // Reject NaN/Inf before any arithmetic — propagating them through the
    // float→int cast is undefined behaviour.
    if (!std::isfinite(x) || !std::isfinite(y)) {
        return false;
    }
    // Use std::floor so a negative offset (e.g. x=-100, origin=0, cell=300)
    // produces a negative col/row, not a truncate-toward-zero 0.
    float fx = (x - origin_x_) / static_cast<float>(cell_size_);
    float fy = (y - origin_y_) / static_cast<float>(cell_size_);
    // Bounds-check in FLOAT space before casting. Casting a finite-but-huge
    // float (e.g. from malformed perspective coefficients producing 1e20)
    // to int is undefined when it exceeds INT_MAX. Comparing in float space
    // is safe because both sides are finite.
    if (fx < 0.0f || fy < 0.0f) return false;
    if (fx >= static_cast<float>(cols_) || fy >= static_cast<float>(rows_)) return false;
    // After the bounds check, fx and fy are in [0, cols_/rows_), so the
    // floor + cast is well-defined.
    int c = static_cast<int>(std::floor(fx));
    int r = static_cast<int>(std::floor(fy));
    col = c;
    row = r;
    return true;
}

int Grid::xy_to_cell(float x, float y) const {
    int col, row;
    if (!xy_to_col_row(x, y, col, row)) {
        return -1;
    }
    return row * cols_ + col;
}

int Grid::cell_zone(int cell_index) const {
    if (cell_index < 0 || cell_index >= cell_count()) return 0;
    return (cells_[cell_index] & CELL_ZONE_MASK) >> CELL_ZONE_SHIFT;
}

bool Grid::cell_is_room(int cell_index) const {
    if (cell_index < 0 || cell_index >= cell_count()) return false;
    return (cells_[cell_index] & CELL_ROOM_BIT) != 0;
}

int Grid::cell_overlay(int cell_index) const {
    if (cell_index < 0 || cell_index >= cell_count()) return 0;
    return (cells_[cell_index] & CELL_OVERLAY_MASK) >> CELL_OVERLAY_SHIFT;
}

void Grid::load_from_bytes(const uint8_t* data, int len) {
    // Public API takes a signed int — clamp negative input to 0 so we never
    // walk a negative index into cells_[] (which would corrupt memory).
    if (len < 0) return;
    int count = std::min(len, cell_count());
    for (int i = 0; i < count; ++i) {
        cells_[i] = data[i];
    }
    // Zero the tail so a shorter buffer doesn't leave stale cells from a
    // previous load (e.g. switching configurations).
    for (int i = count; i < cell_count(); ++i) {
        cells_[i] = 0;
    }
}

}  // namespace epp
