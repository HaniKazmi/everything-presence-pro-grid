#pragma once

#include "epp_types.h"

namespace epp {

enum class RelayTriggerMode : uint8_t {
    DISABLED = 0,
    MANUAL = 1,
    MOTION = 2,
    PRESENCE = 3,
    MOTION_OR_PRESENCE = 4,
};

enum class RelayContactMode : uint8_t {
    NORMALLY_OPEN = 0,
    NORMALLY_CLOSED = 1,
};

struct RelayEvalInput {
    RelayTriggerMode trigger_mode;
    RelayContactMode contact_mode;
    bool motion_active;
    bool occupancy;
};

struct RelayEvalResult {
    bool should_update;
    bool desired_state;
};

inline RelayEvalResult evaluate_relay(const RelayEvalInput &input) {
    if (input.trigger_mode == RelayTriggerMode::DISABLED) {
        return {true, false};
    }
    if (input.trigger_mode == RelayTriggerMode::MANUAL) {
        return {false, false};
    }

    bool activate = false;
    switch (input.trigger_mode) {
        case RelayTriggerMode::MOTION:
            activate = input.motion_active;
            break;
        case RelayTriggerMode::PRESENCE:
            activate = input.occupancy;
            break;
        case RelayTriggerMode::MOTION_OR_PRESENCE:
            activate = input.motion_active || input.occupancy;
            break;
        default:
            break;
    }

    bool desired = (input.contact_mode == RelayContactMode::NORMALLY_OPEN)
                   ? activate : !activate;
    return {true, desired};
}

}  // namespace epp
