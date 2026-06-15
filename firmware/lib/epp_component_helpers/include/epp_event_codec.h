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
//   ZONE           p0=zid, p1=state(0 clear/1 occ/2 pending),
//                  p2=clear reason (0 timeout/1 handoff/2 overlay/3 force, p1==0
//                  only)                                     -> zc:Z:r / zo:Z / zp:Z
//                  r = t(timeout) / h(handoff) / o(overlay) / f(force)
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
#include <cstring>

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
      if (e.p1 == 1) {
        std::snprintf(out, n, "zo:%d", e.p0);
      } else if (e.p1 == 2) {
        std::snprintf(out, n, "zp:%d", e.p0);
      } else {
        // CLEAR carries a reason char from p2 (0=timeout/1=handoff/2=overlay/
        // 3=force); clamp out-of-range p2 to timeout so a malformed event still
        // produces a valid code.
        static const char kReason[4] = {'t', 'h', 'o', 'f'};
        char r = (e.p2 >= 0 && e.p2 <= 3) ? kReason[e.p2] : 't';
        std::snprintf(out, n, "zc:%d:%c", e.p0, r);
      }
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
      // p0 is the (int16_t)-cast dropped total from EventQueue::serialize. The
      // cast is safe by construction: the max droppable per publish window is
      // small (a few busy ticks' worth, well under int16_t's 32767), so it
      // never wraps to a negative or surprising value.
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
// Two independent caps protect the wire format, and BOTH funnel into one xd
// marker so the panel sees a single "events dropped" gap:
//
//   * CAP (32) caps RETENTION. Each engine tick can emit up to MAX_EVENTS=16
//     events and ~10 ticks elapse between publishes, so a worst-case burst is
//     ~160 events. We don't retain all of them — the freshest activity is the
//     most useful to show — so on overflow the OLDEST event is evicted and
//     dropped_ is bumped. 32 is a small, cheap-to-shift ring that comfortably
//     holds a couple of busy ticks' worth of distinct transitions.
//   * serialize()'s budget caps WIRE SIZE. The zone-state JSON lives in a fixed
//     char[512]; after the ~306-byte prefix only ~205 bytes remain for the "ev"
//     body, which fits far fewer than 32 of the longest codes. serialize() is
//     therefore budget-aware: it stops emitting before it would overflow the
//     BoundedWriter, reserving room for the caller's trailing "]}" AND for a
//     final drop marker.
//
// serialize() reports (overflow-dropped + un-emitted-for-budget) as ONE
// appended "xd:<total>" marker so the panel can surface the gap. The marker is
// appended (not prepended) so the reserve math is exact.
class EventQueue {
 public:
  static constexpr int CAP = 32;

  // Bytes serialize() holds back from the BoundedWriter so the tail always
  // fits. NOTE: BoundedWriter::remaining() INCLUDES the NUL slot, so the largest
  // payload string still writable is remaining() - 1 — the reserve must account
  // for that extra slot. The held-back tail must cover the caller's trailing
  // "]}" (2 bytes) plus a worst-case drop marker as the last array element. The
  // marker is `,"xd:<n>"` = 1 (comma) + 1 (open quote) + 3 ("xd:") + the digits
  // + 1 (close quote). total_dropped is cast to int16_t, so the widest possible
  // value is "-32768" (6 chars) → marker = 1+1+3+6+1 = 12 payload bytes. Tail =
  // 12 (marker) + 2 ("]}") = 14 payload bytes, which needs remaining() >= 15
  // (the +1 is the NUL-slot accounting). So reserve 15 — bulletproof for any
  // int16_t drop count (5-digit positive counts only need 14, but 15 also
  // covers the pathological negative cast). Held-back budget is
  // generous-by-design: it guarantees the closing bytes and the marker always
  // fit even when every event was truncated.
  static constexpr size_t CLOSING_RESERVE = 15;

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
  // quoted code. Budget-aware: stops emitting before it would overflow `w`,
  // holding back CLOSING_RESERVE bytes for the caller's trailing "]}" and a
  // final drop marker. Any events that don't fit (plus the queue-overflow
  // drops) are reported as ONE appended "xd:<total>" marker — guaranteed to fit
  // thanks to the reserve — so the panel always receives valid JSON.
  void serialize(BoundedWriter &w) const {
    bool first = true;
    char code[24];

    // How much body we can write before we MUST stop to leave room for the
    // closing bytes + marker. remaining() includes the NUL slot; once it would
    // dip below CLOSING_RESERVE we stop. Guard against a writer so small the
    // reserve doesn't even fit (then we emit nothing but the marker still has
    // room because the caller sized for at least the prefix + reserve).
    int truncated = 0;
    int i = 0;
    for (; i < count_; ++i) {
      format_event_code(buf_[i], code, sizeof(code));
      // Bytes this element would add: optional comma + 2 quotes + code length.
      size_t add = (first ? 0u : 1u) + 2u + std::strlen(code);
      // After writing, remaining() drops by `add`; we must still keep
      // CLOSING_RESERVE for "]}" + the marker. If it wouldn't, stop here and
      // count this and every later event as truncated.
      if (w.remaining() < add + CLOSING_RESERVE) break;
      w.printf("%s\"%s\"", first ? "" : ",", code);
      first = false;
    }
    truncated = count_ - i;

    // Total gap = queue-overflow drops + events we couldn't fit on the wire.
    // dropped_ can only grow by at most one per push() over a small window, so
    // the sum stays well within int16_t; the cast in the marker is safe by
    // construction (see EVENTS_DROPPED note below).
    int total_dropped = dropped_ + truncated;
    if (total_dropped > 0) {
      const Event marker{EventType::EVENTS_DROPPED, (int16_t) total_dropped, 0,
                         0};
      format_event_code(marker, code, sizeof(code));
      // Fits because of CLOSING_RESERVE (we stopped early to keep room for it).
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
