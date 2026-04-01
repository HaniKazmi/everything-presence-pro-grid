#pragma once

#include "epp_types.h"

namespace epp {

enum class RelayTriggerMode : uint8_t {
    DISABLED = 0,
    MOTION = 1,
    PRESENCE = 2,
    OCCUPANCY = 3,
};

enum class RelayContactMode : uint8_t {
    NORMALLY_OPEN = 0,
    NORMALLY_CLOSED = 1,
};

struct RelayEvalInput {
    RelayTriggerMode trigger_mode;
    RelayContactMode contact_mode;
    bool motion_active;       // result.motion_state != INACTIVE (PIR)
    bool static_presence;     // result.static_state != INACTIVE (mmWave)
    bool occupancy;           // result.occupancy (combined)
};

struct RelayEvalResult {
    bool should_update;
    bool desired_state;
};

inline RelayEvalResult evaluate_relay(const RelayEvalInput &input) {
    if (input.trigger_mode == RelayTriggerMode::DISABLED) {
        return {true, false};
    }

    bool activate = false;
    switch (input.trigger_mode) {
        case RelayTriggerMode::MOTION:
            activate = input.motion_active;
            break;
        case RelayTriggerMode::PRESENCE:
            activate = input.static_presence;
            break;
        case RelayTriggerMode::OCCUPANCY:
            activate = input.occupancy;
            break;
        default:
            return {true, false};
    }

    bool desired = (input.contact_mode == RelayContactMode::NORMALLY_OPEN)
                   ? activate : !activate;
    return {true, desired};
}

}  // namespace epp
