// Tests for the detection-log event codec and accumulating queue.
//
// epp_event_codec.h is the SINGLE SOURCE OF TRUTH for the wire format that
// turns a structured epp::Event into the compact code the panel decodes. The
// EventQueue accumulates events across the ~10 engine ticks between each ~1Hz
// zone-state publish and serializes them as the body of a JSON array.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <algorithm>
#include <cstring>
#include <string>
#include <vector>

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
  CHECK(code({EventType::ZONE, 3, 1, 0}) == "zo:3");  // occupied — no reason
  CHECK(code({EventType::ZONE, 3, 2, 0}) == "zp:3");  // pending — no reason
  // CLEAR carries a reason char from p2: 0=timeout, 1=handoff, 2=overlay, 3=force.
  CHECK(code({EventType::ZONE, 3, 0, 0}) == "zc:3:t");
  CHECK(code({EventType::ZONE, 3, 0, 1}) == "zc:3:h");
  CHECK(code({EventType::ZONE, 3, 0, 2}) == "zc:3:o");
  CHECK(code({EventType::ZONE, 3, 0, 3}) == "zc:3:f");
  // Out-of-range p2 clamps to timeout so a malformed event stays valid.
  CHECK(code({EventType::ZONE, 3, 0, 9}) == "zc:3:t");
  // p2 is ignored for occupied/pending (no reason in the wire code).
  CHECK(code({EventType::ZONE, 3, 1, 3}) == "zo:3");
  CHECK(code({EventType::ZONE, 3, 2, 3}) == "zp:3");
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

TEST_CASE("EventQueue overflow keeps newest, appends xd marker at the end") {
  EventQueue q;
  for (int i = 0; i < 35; ++i)
    q.push({EventType::TARGET_LEFT, (int16_t)(i % 3), 0, 0});
  char b[512];
  BoundedWriter w(b, sizeof(b));
  q.serialize(w);
  // The drop marker is now APPENDED (last array element), not prepended, so the
  // budget math (reserve room for ]} + the marker) stays correct. 35 pushes
  // into a CAP=32 queue drops the 3 oldest.
  std::string s(b);
  CHECK(s.size() >= 6);
  CHECK(s.substr(s.size() - 6) == "\"xd:3\"");
}

TEST_CASE("EventQueue budget-aware serialize never overflows and reports drops") {
  // Mirror the component: a realistic ~306-byte fixed prefix lands in a
  // char[512] BoundedWriter, leaving only ~205 bytes for the "ev" body. Push
  // far more events (the longest codes) than can fit, then close with "]}".
  // serialize() must stop early so the whole payload still fits (w.ok()), and
  // account for every un-emitted + overflow-dropped event via a single xd
  // marker.
  EventQueue q;
  for (int i = 0; i < 60; ++i)  // 60 pushes: 28 overflow-dropped (CAP=32)
    q.push({EventType::TARGET_MOVED, 1, 1, 2});  // "tm:1:1:2" — the longest code

  char json[512];
  BoundedWriter w(json, sizeof(json));
  // Representative ~306-byte prefix (3 targets + 8 zones + sensor fields +
  // frame_count), ending exactly where the component opens the "ev" array.
  w.printf(
      "{\"targets\":[{\"signal\":100,\"status\":\"moving\"},"
      "{\"signal\":80,\"status\":\"stationary\"},"
      "{\"signal\":0,\"status\":\"inactive\"}],"
      "\"zones\":{\"occupancy\":[true,false,true,false,true,false,true,false],"
      "\"tracking\":true},"
      "\"static_state\":\"A\",\"motion_state\":\"P\",\"occupancy\":true,"
      "\"mmwave\":true,\"frame_count\":42,\"ev\":[");
  CHECK(w.ok() == true);
  // A realistic full prefix (3 targets + 8 zones + sensor fields + frame_count)
  // is ~290-310 bytes, leaving only ~200 bytes of the char[512] for the body.
  CHECK(w.size() >= 280);

  q.serialize(w);
  w.printf("]}");

  // NO truncation: serialize stopped early to leave room for "]}" and the
  // marker, so the whole payload fits.
  CHECK(w.ok() == true);

  std::string s(json);
  REQUIRE(s.size() >= 2);
  CHECK(s.substr(s.size() - 2) == "]}");
  // Some events didn't fit — there must be an xd marker accounting for them.
  CHECK(s.find("\"xd:") != std::string::npos);

  // Structurally balanced JSON: equal [ vs ], { vs }, and quotes paired.
  auto count = [&](char c) {
    return (long)std::count(s.begin(), s.end(), c);
  };
  CHECK(count('[') == count(']'));
  CHECK(count('{') == count('}'));
  CHECK(count('"') % 2 == 0);
}

TEST_CASE("EventQueue budget-aware serialize uses all budget when it just fits") {
  // A tiny number of events fits with room to spare — no xd marker, full body.
  EventQueue q;
  q.push({EventType::ZONE, 0, 1, 0});
  q.push({EventType::STATIC, 2, 0, 0});
  char b[128];
  BoundedWriter w(b, sizeof(b));
  q.serialize(w);
  w.printf("]}");
  CHECK(w.ok() == true);
  CHECK(std::string(b) == "\"zo:0\",\"sc\"]}");
}

TEST_CASE("EventQueue serialize stops before overflowing a tight buffer") {
  // Buffer with only enough room for a couple of codes plus the reserve. The
  // un-emitted events must surface as an xd marker and the result must close
  // cleanly when the caller writes "]}".
  EventQueue q;
  for (int i = 0; i < 10; ++i) q.push({EventType::TARGET_MOVED, 1, 2, 3});
  char b[40];
  BoundedWriter w(b, sizeof(b));
  q.serialize(w);
  w.printf("]}");
  CHECK(w.ok() == true);
  std::string s(b);
  REQUIRE(s.size() >= 2);
  CHECK(s.substr(s.size() - 2) == "]}");
  CHECK(s.find("\"xd:") != std::string::npos);
}

// Open `{"ev":[`, serialize the body into a buffer of exactly `cap` bytes, then
// close with `]}` — mirroring the component. Asserts the whole payload closes
// cleanly at this buffer size: writer stays ok(), output ends with "]}", and
// brackets/quotes are balanced (structurally valid JSON). Returns the string so
// callers can add their own assertions.
static std::string serialize_full_payload(const EventQueue &q, size_t cap) {
  std::vector<char> buf(cap);
  BoundedWriter w(buf.data(), buf.size());
  w.printf("{\"ev\":[");  // 7-byte opener, as the component emits
  REQUIRE(w.ok() == true);
  q.serialize(w);
  w.printf("]}");

  // The whole tail must fit: serialize() must have held back enough for both the
  // appended drop marker AND the caller's closing "]}".
  CHECK(w.ok() == true);
  std::string s(buf.data());
  REQUIRE(s.size() >= 2);
  CHECK(s.substr(s.size() - 2) == "]}");
  auto count = [&](char c) {
    return (long)std::count(s.begin(), s.end(), c);
  };
  CHECK(count('[') == count(']'));
  CHECK(count('{') == count('}'));
  CHECK(count('"') % 2 == 0);
  return s;
}

TEST_CASE(
    "CLOSING_RESERVE leaves room for the closing tail at every tight boundary") {
  // Regression for an off-by-one in CLOSING_RESERVE: remaining() INCLUDES the
  // NUL slot, so the usable payload tail is remaining() - 1. The worst-case
  // appended drop marker `,"xd:<n>"` plus the caller's "]}" must always fit. If
  // the reserve is one byte too small, serialize() can emit right up to the
  // limit and leave NO room for the trailing "]}", producing invalid JSON
  // (e.g. ..."xd:NN"] with no closing brace, or w.printf("]}") failing).
  //
  // Sweep a range of tight buffer sizes with a FULL queue of the longest codes
  // so the body loop stops with remaining() landing on every value in the
  // reserve window at some size — including exactly CLOSING_RESERVE, the worst
  // case. At every size the payload must close cleanly (asserted in the helper).
  // The buffer is always large enough to honour the reserve contract (opener +
  // reserve). To exercise the WIDEST marker (the byte the off-by-one hides in)
  // we drive a 5-digit drop count. This passes at CLOSING_RESERVE=15 and FAILS
  // at 13, where the marker + "]}" no longer fit once remaining() sits at the
  // reserve (output ends "..."xd:NNNNN"]" with the closing "}" dropped).
  EventQueue q;
  // 10060 pushes into CAP=32 → dropped_ = 10028, a 5-digit overflow count.
  for (int i = 0; i < 10060; ++i) q.push({EventType::TARGET_MOVED, 1, 2, 3});
  REQUIRE(q.dropped() >= 10000);
  for (size_t cap = 24; cap <= 64; ++cap) {
    CAPTURE(cap);
    std::string s = serialize_full_payload(q, cap);
    // Something was dropped/truncated, so an xd marker must be present.
    CHECK(s.find("\"xd:") != std::string::npos);
  }
}

TEST_CASE(
    "5-digit drop marker stays inside its own reserve at the exact boundary") {
  // Pin the precise worst case from the comment: a 5-digit drop count whose
  // appended marker `,"xd:NNNNN"` (11 payload bytes) + the caller's "]}" (2)
  // = 13 payload bytes lands when the body loop has left remaining() exactly at
  // the reserve. Sweep from tiny buffers (marker only, no body emitted, count =
  // dropped_ + all-truncated) up to roomy ones (some body emitted, marker
  // comma-prefixed — the widest tail). At EVERY size the payload must be valid,
  // the marker must report a 5-digit count, and the sweep must hit the
  // comma-prefixed widest form. With CLOSING_RESERVE=13 the closing "}" is
  // dropped at the tightest sizes (..."xd:NNNNN"]); 15 fits.
  EventQueue q;
  for (int i = 0; i < 10060; ++i) q.push({EventType::TARGET_MOVED, 1, 2, 3});
  REQUIRE(q.dropped() == 10028);  // 10060 pushes − CAP(32) retained

  // Matches a quoted 5-digit drop marker, optionally comma-prefixed.
  auto find_marker = [](const std::string &s, bool comma) -> bool {
    const std::string prefix = comma ? ",\"xd:" : "\"xd:";
    size_t at = s.find(prefix);
    if (at == std::string::npos) return false;
    size_t d = at + prefix.size();  // first digit
    int digits = 0;
    while (d < s.size() && s[d] >= '0' && s[d] <= '9') {
      ++d;
      ++digits;
    }
    return digits == 5 && d < s.size() && s[d] == '"';
  };

  bool saw_comma_prefixed_marker = false;
  for (size_t cap = 24; cap <= 80; ++cap) {
    CAPTURE(cap);
    std::string s = serialize_full_payload(q, cap);
    // The marker reports a 5-digit count (dropped_ + any truncated body events).
    CHECK(find_marker(s, /*comma=*/false));
    if (find_marker(s, /*comma=*/true)) saw_comma_prefixed_marker = true;
  }
  // The sweep must have hit the comma-prefixed (widest tail) case at least once,
  // proving the reserve covers the genuine worst case, not just the lone marker.
  CHECK(saw_comma_prefixed_marker);
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
