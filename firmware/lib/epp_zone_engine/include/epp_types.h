#pragma once

#include <algorithm>
#include <cstdint>

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
// Overlay field — bits 4-5, kind 0..3
constexpr uint8_t CELL_OVERLAY_MASK = 0x30;
constexpr int CELL_OVERLAY_SHIFT = 4;
constexpr uint8_t CELL_OVERLAY_NONE = 0;
constexpr uint8_t CELL_OVERLAY_ENTRY = 1;
constexpr uint8_t CELL_OVERLAY_INTERFERENCE = 2;
constexpr uint8_t CELL_OVERLAY_SUPPRESS = 3;

// Limits
constexpr int MAX_TARGETS = 3;
constexpr int MAX_ZONES = 7;  // named zones 1-7; zone 0 is implicit rest-of-room
constexpr int MAX_ZONE_SLOTS = 8;  // zone 0 + zones 1-7
constexpr int MAX_MOVEMENT_CELLS = 5;  // continuity Chebyshev threshold

// Canonical rolling-window size: 1000ms at 10Hz nominal sensor rate. The
// signal scale (0–9) is computed against this fixed denominator so that
// sensor over-delivery cannot dilute the published signal and the firmware's
// confirmation decision matches what the frontend zone engine sees.
constexpr int CANONICAL_FRAMES = 10;

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

// Sensor presence state (software-managed timeout)
enum class SensorPresenceState : uint8_t {
    INACTIVE = 0,
    ACTIVE = 1,
    PENDING = 2,
};

// Log levels for zone engine diagnostic output
enum class LogLevel : uint8_t {
    INFO = 0,
    DEBUG = 1,
};

struct LogEntry {
    LogLevel level = LogLevel::INFO;
    char message[96]{};
};

constexpr int MAX_LOG_ENTRIES = 16;

// Compute the published signal (0–9 scale) from a frame count.
// Frames are counted over a fixed CANONICAL_FRAMES window (1000ms @ 10Hz nominal),
// so the count maps 1:1 onto the signal scale and saturates at 9. Sensor
// over-delivery (frame_count > CANONICAL_FRAMES) is capped, never inflated.
inline int frame_count_to_signal(int frame_count) {
    return std::min(frame_count, 9);
}

// Clamp a user-set threshold to a meaningful comparison value. Trigger/renew
// are stored 0–9; 0 is treated as 1 ("any active frame triggers") so a
// disabled-looking value never makes every tick confirm.
inline int clamp_threshold(int threshold) {
    return std::max(1, threshold);
}

}  // namespace epp
