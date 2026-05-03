#pragma once

#include <ArduinoJson.h>

#include "epp_types.h"
#include "epp_zone_engine.h"

namespace epp {

/// Parse zone configs from `doc["zone_slots"]`. Writes up to MAX_ZONE_SLOTS
/// entries into `out`, updating `count`.
///
/// Slot index IS the zone id (any `id` in the payload is ignored). Null or
/// non-object entries are skipped. Slot indices >= MAX_ZONE_SLOTS are dropped
/// — the writer side guarantees the array is at most MAX_ZONE_SLOTS, so
/// reaching one indicates a malformed payload. If slot 0 is missing/null the
/// parser emits no zone-0 entry; downstream, ZoneEngine::set_zones seeds
/// zone 0 from ZoneConfig's in-class defaults so occupancy tracking still
/// runs.
///
/// The payload's `"type"` field (if present) is informational-only and is
/// ignored by firmware. The backend is the sole owner of type→timing
/// expansion and pushes the resolved timing values directly.
///
/// Trigger/renew are clamped to [1, 9] (matches the 0-9 signal scale; 0 means
/// "always trigger" which is degenerate). Timeout/handoff_timeout are clamped
/// to >= 0 to fail-safe on malformed payloads.
///
/// Callers must pass a freshly-initialised `out` and `count == 0`.
inline void parse_zone_configs(const JsonDocument &doc, ZoneConfig out[], int &count) {
  JsonArrayConst slots = doc["zone_slots"].as<JsonArrayConst>();
  for (size_t i = 0; i < slots.size() && count < MAX_ZONE_SLOTS; i++) {
    if (i >= static_cast<size_t>(MAX_ZONE_SLOTS)) break;  // slot index out of range
    if (slots[i].isNull()) {
      continue;  // unused named-zone slot; slot 0 null → engine falls back to struct defaults
    }
    if (!slots[i].is<JsonObjectConst>()) {
      continue;  // corrupt/non-object entry — don't fabricate a zone from bad data
    }
    JsonObjectConst z = slots[i].as<JsonObjectConst>();
    int trigger = z["trigger"] | 5;
    int renew = z["renew"] | 3;
    float timeout = z["timeout"] | 10.0f;
    float handoff_timeout = z["handoff_timeout"] | 3.0f;
    if (trigger < 1) trigger = 1;
    if (trigger > 9) trigger = 9;
    if (renew < 1) renew = 1;
    if (renew > 9) renew = 9;
    if (timeout < 0.0f) timeout = 0.0f;
    if (handoff_timeout < 0.0f) handoff_timeout = 0.0f;
    out[count] = {
        static_cast<int>(i),  // index = slot position (0 = zone 0, 1-7 = named)
        trigger,
        renew,
        timeout,
        handoff_timeout,
    };
    count++;
  }
}

}  // namespace epp
