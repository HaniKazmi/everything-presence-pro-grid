#pragma once

#include <ArduinoJson.h>

#include "epp_types.h"
#include "epp_zone_engine.h"

namespace epp {

/// Parse zone configs from `doc["zone_slots"]`. Writes up to MAX_ZONE_SLOTS
/// entries into `out`, updating `count`.
///
/// Slot index IS the zone id (any `id` in the payload is ignored). Null or
/// non-object entries are skipped — if slot 0 is missing, zone 0 is absent
/// and zone-0 occupancy reports false (fail-closed).
///
/// The payload's `"type"` field (if present) is informational-only and is
/// ignored by firmware. The backend is the sole owner of type→timing
/// expansion and pushes the resolved timing values directly.
///
/// Callers must pass a freshly-initialised `out` and `count == 0`.
inline void parse_zone_configs(const JsonDocument &doc, ZoneConfig out[], int &count) {
  JsonArrayConst slots = doc["zone_slots"].as<JsonArrayConst>();
  for (size_t i = 0; i < slots.size() && count < MAX_ZONE_SLOTS; i++) {
    if (slots[i].isNull()) {
      continue;  // unused named-zone slot; zone 0 absent if slot 0 is null
    }
    if (!slots[i].is<JsonObjectConst>()) {
      continue;  // corrupt/non-object entry — fail closed, don't fabricate a zone
    }
    JsonObjectConst z = slots[i].as<JsonObjectConst>();
    out[count] = {
        static_cast<int>(i),  // index = slot position (0 = zone 0, 1-7 = named)
        z["trigger"] | 5,
        z["renew"] | 3,
        z["timeout"] | 10.0f,
        z["handoff_timeout"] | 3.0f,
    };
    count++;
  }
}

}  // namespace epp
