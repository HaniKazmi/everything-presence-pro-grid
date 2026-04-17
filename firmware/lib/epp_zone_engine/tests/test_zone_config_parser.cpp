#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <ArduinoJson.h>

#include "epp_types.h"
#include "epp_zone_engine.h"
#include "epp_zone_config_parser.h"

using namespace epp;

namespace {

/// Parse a JSON string through ArduinoJson, then through the shared helper.
/// Returns the number of entries written. `out` must have at least
/// `MAX_ZONE_SLOTS` entries.
int parse_from_string(const char *json, ZoneConfig out[]) {
  JsonDocument doc;
  auto err = deserializeJson(doc, json);
  REQUIRE(err == DeserializationError::Ok);
  int count = 0;
  parse_zone_configs(doc, out, count);
  return count;
}

}  // namespace

TEST_CASE("zone_slots[0] provides zone 0 timing (no id/name, just timing)") {
  // New unified shape: zone 0 lives in zone_slots[0] with only timing fields.
  // Named zones 1-7 live in zone_slots[1..7] and carry id/name/color.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"id\":1,\"name\":\"Living\",\"type\":\"rest\",\"trigger\":7,\"renew\":1,\"timeout\":30.0,\"handoff_timeout\":10.0},"
      "null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 2);

  // Zone 0 (slot 0): parsed from zone_slots[0], not from root room_* fields.
  CHECK(configs[0].id == 0);
  CHECK(configs[0].type == ZoneType::NORMAL);
  CHECK(configs[0].trigger == 5);
  CHECK(configs[0].renew == 3);
  CHECK(configs[0].timeout == doctest::Approx(10.0f));
  CHECK(configs[0].handoff_timeout == doctest::Approx(3.0f));

  // Zone 1 (slot 1): parsed from zone_slots[1], id = slot index.
  CHECK(configs[1].id == 1);
  CHECK(configs[1].type == ZoneType::REST);
  CHECK(configs[1].trigger == 7);
  CHECK(configs[1].renew == 1);
  CHECK(configs[1].timeout == doctest::Approx(30.0f));
  CHECK(configs[1].handoff_timeout == doctest::Approx(10.0f));
}

TEST_CASE("zone 0 timing values are respected (REST type propagates)") {
  // Proves the parser reads type/trigger/renew/timeout/handoff_timeout from
  // zone_slots[0] and not from root-level room_* fields. The root-level
  // fields are absent here.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"type\":\"rest\",\"trigger\":7,\"renew\":1,\"timeout\":30.0,\"handoff_timeout\":10.0},"
      "null,null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 1);
  CHECK(configs[0].id == 0);
  CHECK(configs[0].type == ZoneType::REST);
  CHECK(configs[0].trigger == 7);
  CHECK(configs[0].renew == 1);
  CHECK(configs[0].timeout == doctest::Approx(30.0f));
  CHECK(configs[0].handoff_timeout == doctest::Approx(10.0f));
}

TEST_CASE("null at zone_slots[0] omits zone 0 (fail-closed)") {
  // If backend guarantee fails (zone 0 missing), the parser must not
  // fabricate one. No zone 0 → occupancy reports false.
  const char *json =
      "{"
      "\"zone_slots\":["
      "null,"
      "{\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  // Only the slot-1 entry is written; zone 0 is absent.
  REQUIRE(count == 1);
  CHECK(configs[0].id == 1);
}

TEST_CASE("missing zone_slots array yields no zones") {
  const char *json = "{}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  CHECK(count == 0);
}

TEST_CASE("non-object slot entries are skipped (no phantom zones)") {
  // If the stored JSON is corrupted and a slot is a string/number/array,
  // parse_zone_configs must NOT fabricate a zone with default thresholds.
  const char *json =
      "{"
      "\"zone_slots\":["
      "\"not an object\","
      "42,"
      "[],"
      "{\"id\":3,\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  // Only the valid object at slot 3 produces a zone.
  REQUIRE(count == 1);
  CHECK(configs[0].id == 3);
}

TEST_CASE("slot id field is ignored in favour of slot index") {
  // Even if the payload carries an id, the slot position wins. Prevents a
  // stale id from shifting a zone's slot.
  const char *json =
      "{"
      "\"zone_slots\":["
      "{\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "{\"id\":99,\"type\":\"normal\",\"trigger\":5,\"renew\":3,\"timeout\":10.0,\"handoff_timeout\":3.0},"
      "null,null,null,null,null,null"
      "]"
      "}";

  ZoneConfig configs[MAX_ZONE_SLOTS]{};
  int count = parse_from_string(json, configs);

  REQUIRE(count == 2);
  CHECK(configs[0].id == 0);  // slot 0
  CHECK(configs[1].id == 1);  // slot 1, not 99
}
