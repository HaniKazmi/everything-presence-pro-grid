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

/// Parse zone configs from `doc["zone_slots"]`. Writes up to MAX_ZONE_SLOTS
/// entries into `out`, updating `count`.
///
/// Slot index IS the zone id (any `id` in the payload is ignored). Null or
/// non-object entries are skipped — if slot 0 is missing, zone 0 is absent
/// and zone-0 occupancy reports false (fail-closed).
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
