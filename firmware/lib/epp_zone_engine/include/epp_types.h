#pragma once

#include <cstdint>
#include <array>

namespace epp {

// Grid constants — must match Python const.py and TypeScript grid.ts
constexpr int GRID_COLS = 20;
constexpr int GRID_ROWS = 20;
constexpr int GRID_CELL_COUNT = GRID_COLS * GRID_ROWS;
constexpr int GRID_CELL_SIZE_MM = 300;

// Cell byte encoding
constexpr uint8_t CELL_ROOM_BIT = 0x01;
constexpr int CELL_ZONE_SHIFT = 1;
constexpr uint8_t CELL_ZONE_MASK = 0x0E;
constexpr uint8_t CELL_TRAINING_MASK = 0xF0;
constexpr int CELL_TRAINING_SHIFT = 4;

// Limits
constexpr int MAX_TARGETS = 3;
constexpr int MAX_ZONES = 7;  // named zones 1-7; zone 0 is implicit rest-of-room
constexpr int MAX_ZONE_SLOTS = 8;  // zone 0 + zones 1-7
constexpr int MAX_MOVEMENT_CELLS = 5;  // continuity Chebyshev threshold
constexpr int RAW_FPS = 10;  // expected frames per second from LD2450

// Target status
enum class TargetStatus : uint8_t {
    INACTIVE = 0,
    ACTIVE = 1,
    PENDING = 2,
};

// Zone state
enum class ZoneState : uint8_t {
    CLEAR = 0,
    OCCUPIED = 1,
    PENDING_CLEAR = 2,
};

}  // namespace epp
