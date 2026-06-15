#pragma once
//
// epp_event_codec — the SINGLE SOURCE OF TRUTH for the detection-log wire
// format. An epp::Event (structured, produced by the zone engine) is turned
// into a compact code string the panel decodes. The EventQueue accumulates
// those events across the ~10 engine ticks that occur between each ~1Hz
// zone-state publish, then serializes them as the body of a JSON array.
//
// Wire-code contract (Event -> code):
//   STATIC         p0=state(0 active/1 pending/2 inactive)  -> sa / sp / sc
//   MOTION         p0=state                                 -> ma / mp / mc
//   ZONE           p0=zid, p1=state(0 clear/1 occ/2 pending)-> zc:Z / zo:Z / zp:Z
//   OCCUPANCY      p0=on                                    -> oo / of
//   MMWAVE         p0=on                                    -> wo / wf
//   FORCE_CLEAR    p0=zid                                   -> fc:Z
//   STUCK_DISMISS  p0=tid, p1=secs                          -> td:T:secs
//   TARGET_ENTERED p0=tid, p1=zid                           -> te:T:Z
//   TARGET_LEFT    p0=tid                                   -> tl:T
//   TARGET_MOVED   p0=tid, p1=fromZ, p2=toZ                 -> tm:T:Za:Zb
//   EVENTS_DROPPED p0=n                                     -> xd:n

#include <cstddef>
#include <cstdio>

#include "epp_json_writer.h"
#include "epp_types.h"

namespace epp {

// Format a single Event into `out` as a NUL-terminated wire code. `n` is the
// full size of `out`; snprintf keeps the write bounded and terminated even if
// `out` is too small (codes top out well under 24 bytes).
inline void format_event_code(const Event &e, char *out, size_t n) {
  if (out == nullptr || n == 0) return;
  // Sensor active/pending/clear suffix indexed by state p0 (0/1/2).
  static const char kStateSuffix[3] = {'a', 'p', 'c'};
  auto suffix = [](int16_t state) -> char {
    return (state >= 0 && state <= 2) ? kStateSuffix[state] : '?';
  };
  switch (e.type) {
    case EventType::STATIC:
      std::snprintf(out, n, "s%c", suffix(e.p0));
      break;
    case EventType::MOTION:
      std::snprintf(out, n, "m%c", suffix(e.p0));
      break;
    case EventType::ZONE: {
      const char *prefix = e.p1 == 1 ? "zo" : e.p1 == 2 ? "zp" : "zc";
      std::snprintf(out, n, "%s:%d", prefix, e.p0);
      break;
    }
    case EventType::OCCUPANCY:
      std::snprintf(out, n, "%s", e.p0 ? "oo" : "of");
      break;
    case EventType::MMWAVE:
      std::snprintf(out, n, "%s", e.p0 ? "wo" : "wf");
      break;
    case EventType::FORCE_CLEAR:
      std::snprintf(out, n, "fc:%d", e.p0);
      break;
    case EventType::STUCK_DISMISS:
      std::snprintf(out, n, "td:%d:%d", e.p0, e.p1);
      break;
    case EventType::TARGET_ENTERED:
      std::snprintf(out, n, "te:%d:%d", e.p0, e.p1);
      break;
    case EventType::TARGET_LEFT:
      std::snprintf(out, n, "tl:%d", e.p0);
      break;
    case EventType::TARGET_MOVED:
      std::snprintf(out, n, "tm:%d:%d:%d", e.p0, e.p1, e.p2);
      break;
    case EventType::EVENTS_DROPPED:
      std::snprintf(out, n, "xd:%d", e.p0);
      break;
    default:
      out[0] = '\0';
      break;
  }
}

// Accumulating queue of detection-log events. The component pushes the engine's
// per-tick events here every tick and serializes + clears once per ~1Hz publish
// so a one-tick event isn't lost in the ~9/10 ticks that don't publish.
//
// On overflow the OLDEST event is dropped (the freshest activity is the most
// useful to show) and a counter is bumped; serialize() prepends an "xd:<n>"
// marker so the panel can surface the gap.
class EventQueue {
 public:
  static constexpr int CAP = 32;

  // Append an event, evicting the oldest (and counting the drop) if full.
  void push(const Event &e) {
    if (count_ == CAP) {
      // Drop oldest: shift everything down one slot. CAP is small (32) and
      // this only runs on overflow, so the linear shift is negligible.
      for (int i = 1; i < CAP; ++i) buf_[i - 1] = buf_[i];
      --count_;
      ++dropped_;
    }
    buf_[count_++] = e;
  }

  // Write the comma-separated JSON-array BODY (no surrounding []), each event a
  // quoted code. If events were dropped, prepend a quoted "xd:<dropped_>".
  void serialize(BoundedWriter &w) const {
    bool first = true;
    char code[24];
    if (dropped_ > 0) {
      const Event marker{EventType::EVENTS_DROPPED, (int16_t) dropped_, 0, 0};
      format_event_code(marker, code, sizeof(code));
      w.printf("\"%s\"", code);
      first = false;
    }
    for (int i = 0; i < count_; ++i) {
      format_event_code(buf_[i], code, sizeof(code));
      w.printf("%s\"%s\"", first ? "" : ",", code);
      first = false;
    }
  }

  void clear() {
    count_ = 0;
    dropped_ = 0;
  }

  int size() const { return count_; }
  int dropped() const { return dropped_; }

 private:
  Event buf_[CAP]{};
  int count_ = 0;
  int dropped_ = 0;
};

}  // namespace epp
