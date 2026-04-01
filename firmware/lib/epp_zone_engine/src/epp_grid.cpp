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

int Grid::xy_to_cell(float x, float y) const {
    // Match Python: int() truncates toward zero
    int col = static_cast<int>((x - origin_x_) / cell_size_);
    int row = static_cast<int>((y - origin_y_) / cell_size_);
    if (col < 0 || col >= cols_ || row < 0 || row >= rows_) {
        return -1;
    }
    return row * cols_ + col;
}

int Grid::cell_zone(int cell_index) const {
    return (cells_[cell_index] & CELL_ZONE_MASK) >> CELL_ZONE_SHIFT;
}

bool Grid::cell_is_room(int cell_index) const {
    return (cells_[cell_index] & CELL_ROOM_BIT) != 0;
}

bool Grid::cell_has_overlay_entry(int cell_index) const {
    return (cells_[cell_index] & CELL_OVERLAY_ENTRY) != 0;
}

void Grid::load_from_bytes(const uint8_t* data, int len) {
    int count = std::min(len, cell_count());
    for (int i = 0; i < count; ++i) {
        cells_[i] = data[i];
    }
}

}  // namespace epp
