// Tests for the detection-log event codec and accumulating queue.
//
// epp_event_codec.h is the SINGLE SOURCE OF TRUTH for the wire format that
// turns a structured epp::Event into the compact code the panel decodes. The
// EventQueue accumulates events across the ~10 engine ticks between each ~1Hz
// zone-state publish and serializes them as the body of a JSON array.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cstring>
#include <string>

#include "epp_event_codec.h"
#include "epp_json_writer.h"
#include "epp_types.h"

using namespace epp;

static std::string code(const Event &e) {
  char b[24];
  format_event_code(e, b, sizeof(b));
  return std::string(b);
}

TEST_CASE("sensor codes") {
  CHECK(code({EventType::STATIC, 0, 0, 0}) == "sa");
  CHECK(code({EventType::STATIC, 1, 0, 0}) == "sp");
  CHECK(code({EventType::STATIC, 2, 0, 0}) == "sc");
  CHECK(code({EventType::MOTION, 0, 0, 0}) == "ma");
}

TEST_CASE("zone + room codes") {
  CHECK(code({EventType::ZONE, 3, 1, 0}) == "zo:3");
  CHECK(code({EventType::ZONE, 3, 2, 0}) == "zp:3");
  CHECK(code({EventType::ZONE, 3, 0, 0}) == "zc:3");
  CHECK(code({EventType::OCCUPANCY, 1, 0, 0}) == "oo");
  CHECK(code({EventType::OCCUPANCY, 0, 0, 0}) == "of");
  CHECK(code({EventType::MMWAVE, 1, 0, 0}) == "wo");
  CHECK(code({EventType::MMWAVE, 0, 0, 0}) == "wf");
}

TEST_CASE("correction + target codes") {
  CHECK(code({EventType::FORCE_CLEAR, 2, 0, 0}) == "fc:2");
  CHECK(code({EventType::STUCK_DISMISS, 0, 60, 0}) == "td:0:60");
  CHECK(code({EventType::TARGET_ENTERED, 1, 4, 0}) == "te:1:4");
  CHECK(code({EventType::TARGET_LEFT, 2, 0, 0}) == "tl:2");
  CHECK(code({EventType::TARGET_MOVED, 0, 1, 2}) == "tm:0:1:2");
  CHECK(code({EventType::EVENTS_DROPPED, 5, 0, 0}) == "xd:5");
}

TEST_CASE("EventQueue serializes pushed events as JSON array body") {
  EventQueue q;
  q.push({EventType::ZONE, 0, 1, 0});
  q.push({EventType::STATIC, 2, 0, 0});
  char b[128];
  BoundedWriter w(b, sizeof(b));
  q.serialize(w);
  CHECK(std::string(b) == "\"zo:0\",\"sc\"");
}

TEST_CASE("EventQueue overflow keeps newest, prepends xd marker") {
  EventQueue q;
  for (int i = 0; i < 35; ++i)
    q.push({EventType::TARGET_LEFT, (int16_t)(i % 3), 0, 0});
  char b[512];
  BoundedWriter w(b, sizeof(b));
  q.serialize(w);
  CHECK(std::string(b).rfind("\"xd:3\"", 0) == 0);
}

TEST_CASE("EventQueue clear resets size and dropped") {
  EventQueue q;
  q.push({EventType::OCCUPANCY, 1, 0, 0});
  q.clear();
  char b[16];
  BoundedWriter w(b, sizeof(b));
  q.serialize(w);
  CHECK(std::string(b) == "");
}
