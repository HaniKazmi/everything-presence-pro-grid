#pragma once

#include "epp_grid.h"
#include "epp_window.h"
#include "epp_types.h"

#include <algorithm>
#include <cstdint>

namespace epp {

// ---------------------------------------------------------------------------
// Configuration & result structs
// ---------------------------------------------------------------------------

struct ZoneConfig {
    int id = 0;                     // 0-7 (0=rest-of-room)
    int trigger = 5;
    int renew = 3;
    float timeout = 10.0f;
    float handoff_timeout = 3.0f;
};

struct TargetResult {
    float x = 0.0f;
    float y = 0.0f;
    TargetStatus status = TargetStatus::INACTIVE;
    int signal = 0;
};

struct ProcessingResult {
    bool device_tracking_present = false;
    bool zone_occupancy[MAX_ZONE_SLOTS]{};
    ZoneState zone_states[MAX_ZONE_SLOTS]{};
    int zone_target_counts[MAX_ZONE_SLOTS]{};
    int frame_count = 0;
    TargetResult targets[MAX_TARGETS];
    int target_count = 0;
    SensorPresenceState static_state = SensorPresenceState::INACTIVE;
    SensorPresenceState motion_state = SensorPresenceState::INACTIVE;
    bool occupancy = false;
    bool mmwave = false;

    // Diagnostic log entries produced during this tick
    LogEntry log[MAX_LOG_ENTRIES]{};
    int log_count = 0;
};

// ---------------------------------------------------------------------------
// Internal runtime state per zone
// ---------------------------------------------------------------------------

// Default sensor presence timeouts (seconds). Single source of truth for the
// engine and the ESPHome component glue — keeps the two from drifting apart.
constexpr float DEFAULT_STATIC_TIMEOUT_S = 10.0f;
constexpr float DEFAULT_MOTION_TIMEOUT_S = 10.0f;

struct SensorInput {
    bool static_on = false;
    bool motion_on = false;
    float static_timeout = DEFAULT_STATIC_TIMEOUT_S;
    float motion_timeout = DEFAULT_MOTION_TIMEOUT_S;
};

struct ZoneRuntime {
    ZoneConfig config;
    ZoneState state = ZoneState::CLEAR;
    float pending_since = -1.0f;
    uint8_t confirmed_targets = 0;  // bitmask (bits 0-2 for targets 0-2)
};

// ---------------------------------------------------------------------------
// ZoneEngine — state machine that converts calibrated target positions
//              into per-zone occupancy.
// ---------------------------------------------------------------------------

class ZoneEngine {
public:
    ZoneEngine();

    void set_grid(const Grid& grid);
    const Grid& grid() const;
    void set_zones(const ZoneConfig zones[], int count);
    const ProcessingResult& tick(const WindowOutput& window, float timestamp,
                                 const SensorInput& sensors = SensorInput{});
    void dismiss_target(int target_index, int cell_index);

    /// Override the assumed raw-sensor frame rate (default RAW_FPS = 10).
    /// Determines the floor used for signal denominators in tick(). Must be > 0.
    void set_raw_fps(int fps) { raw_fps_ = (fps > 0) ? fps : RAW_FPS; }
    int raw_fps() const { return raw_fps_; }

private:
    Grid grid_;
    ZoneRuntime zones_[MAX_ZONE_SLOTS]{};
    bool zone_enabled_[MAX_ZONE_SLOTS]{};  // which slots are configured
    int zone_count_ = 0;  // highest configured zone_id + 1

    int raw_fps_ = RAW_FPS;

    // Per-target tracking state
    int target_prev_col_[MAX_TARGETS]{};
    int target_prev_row_[MAX_TARGETS]{};
    bool target_has_prev_[MAX_TARGETS]{};
    float target_prev_x_[MAX_TARGETS]{};
    float target_prev_y_[MAX_TARGETS]{};
    bool target_has_prev_xy_[MAX_TARGETS]{};
    int target_gate_count_[MAX_TARGETS]{};
    int target_last_zone_[MAX_TARGETS]{};   // last zone while in-room (-1 = unknown)
    int dismissed_cell_[MAX_TARGETS]{};     // cell index target was dismissed at, or -1
    bool target_overlay_sticky_[MAX_TARGETS]{};  // last in-room on_overlay value

    // Per-target log state (for transition-only logging)
    int target_log_zone_[MAX_TARGETS]{};      // zone confirmed in last tick (-1 = none)
    bool target_log_in_room_[MAX_TARGETS]{};  // was in room last tick

    // Sensor presence state tracking
    SensorPresenceState static_state_ = SensorPresenceState::INACTIVE;
    SensorPresenceState motion_state_ = SensorPresenceState::INACTIVE;
    float static_pending_since_ = -1.0f;
    float motion_pending_since_ = -1.0f;
    bool sensors_ever_active_ = false;  // true once any sensor has been ACTIVE
    bool prev_occupancy_ = false;       // previous tick's occupancy for transition logging

    ProcessingResult result_;

    /// Find the ZoneRuntime index for a given zone_id. Returns -1 if not found.
    /// Invariant: slot index == config.id; established by parse_zone_configs.
    int find_zone_index(int zone_id) const;

    /// Append a log entry to result_.log[] (silently drops if full)
    void log_(LogLevel level, const char* fmt, ...)
        __attribute__((format(printf, 3, 4)));
};

}  // namespace epp
