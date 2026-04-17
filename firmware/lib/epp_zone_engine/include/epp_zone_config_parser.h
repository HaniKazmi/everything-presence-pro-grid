#pragma once

#include <ArduinoJson.h>
#include <cstring>

#include "epp_types.h"
#include "epp_zone_engine.h"

namespace epp {

/// Parse a ZoneType enum from a JSON string value.
///
/// Returns NORMAL for unknown or missing values.
inline ZoneType zone_type_from_str(const char *s) {
  if (s == nullptr) return ZoneType::NORMAL;
  if (strcmp(s, "thoroughfare") == 0) return ZoneType::THOROUGHFARE;
  if (strcmp(s, "rest") == 0) return ZoneType::REST;
  if (strcmp(s, "custom") == 0) return ZoneType::CUSTOM;
  return ZoneType::NORMAL;
}

/// Parse zone configs from the `zone_slots` array at the root of the given
/// JsonDocument. Writes up to `MAX_ZONE_SLOTS` entries into `out`, updating
/// `count` with the number written.
///
/// Expected shape (zone 0 unified into zone_slots[0]):
///   {
///     "zone_slots": [
///       {"type": "...", "trigger": N, "renew": N, "timeout": F, "handoff_timeout": F},
///       {"id": 1, "name": "...", "type": "...", ...},
///       null,
///       ...
///     ]
///   }
///
/// Rules:
/// - Slot index drives the zone id. Index 0 is zone 0 (whole-room), indices
///   1-7 are named zones. Any `id` field in the slot payload is ignored —
///   slot position is authoritative.
/// - `null` entries are skipped. If slot 0 is null or the array is shorter
///   than 1, zone 0 is absent from the output; the zone engine then reports
///   zone 0 occupancy as false (acceptable fail-closed behavior).
/// - If `zone_slots` is missing or not an array, no entries are written.
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
        zone_type_from_str(z["type"] | "normal"),
        z["trigger"] | 5,
        z["renew"] | 3,
        z["timeout"] | 10.0f,
        z["handoff_timeout"] | 3.0f,
    };
    count++;
  }
}

}  // namespace epp
