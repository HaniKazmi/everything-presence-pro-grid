#pragma once

#include <algorithm>
#include <array>
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
constexpr uint8_t CELL_OVERLAY_ENTRY = 0x10;   // bit 4: entry/exit overlay
constexpr uint8_t CELL_TRAINING_MASK = 0xE0;   // bits 5-7
constexpr int CELL_TRAINING_SHIFT = 5;

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

// Zone type — matches Python const.py ZONE_TYPE_* constants
enum class ZoneType : uint8_t {
    NORMAL = 0,
    ENTRANCE = 1,
    THOROUGHFARE = 2,
    REST = 3,
    CUSTOM = 4,
};

// Default parameters per zone type — matches Python ZONE_TYPE_DEFAULTS
struct ZoneTypeDefaults {
    int trigger;
    int renew;
    float timeout;
    float handoff_timeout;
};

// Defaults indexed by ZoneType ordinal (NORMAL, ENTRANCE, THOROUGHFARE, REST).
// CUSTOM has no built-in defaults.
constexpr std::array<ZoneTypeDefaults, 4> ZONE_TYPE_DEFAULTS = {{
    {5, 3, 10.0f, 3.0f},   // NORMAL
    {3, 2, 5.0f, 1.0f},    // ENTRANCE
    {3, 2, 3.0f, 1.0f},    // THOROUGHFARE
    {7, 1, 30.0f, 10.0f},  // REST
}};

// Get defaults for a zone type. Returns NORMAL defaults for CUSTOM or unknown.
inline ZoneTypeDefaults zone_type_defaults(ZoneType type) {
    auto idx = static_cast<unsigned>(type);
    if (idx < ZONE_TYPE_DEFAULTS.size()) {
        return ZONE_TYPE_DEFAULTS[idx];
    }
    return ZONE_TYPE_DEFAULTS[0];  // NORMAL as fallback
}

// Convert a threshold value to a frame count (minimum 1).
inline int threshold_to_frame_count(int threshold) {
    return std::max(1, threshold);
}

}  // namespace epp
