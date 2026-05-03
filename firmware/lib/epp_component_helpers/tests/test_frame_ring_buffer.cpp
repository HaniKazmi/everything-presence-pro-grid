// Tests for the single-producer / single-consumer frame ring buffer.
//
// Item 1 (PR-8): the LD2450 UART lambda calls feed_targets() which writes
// `targets_[]` and sets `frame_ready_=true`. EPPComponent::loop() polls the
// flag and reads the buffer. They are called on the same task in practice,
// but the pattern silently drops frames if loop() is delayed: a new frame
// stomps the old one before loop() consumes it.
//
// The ring buffer keeps the last few frames so a delayed loop() can still
// drain the oldest in FIFO order. When full, the oldest is dropped to make
// room for the new write — the producer is never blocked.
//
// All operations are O(1) and use simple head/tail counters.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cstdint>

#include "epp_frame_ring_buffer.h"

using namespace epp;

// A trivial frame type for tests — the real component uses ParsedTarget[3].
struct TestFrame {
  int id = 0;
  float payload = 0.0f;
};

TEST_CASE("empty buffer reports empty and pop returns false") {
  FrameRingBuffer<TestFrame, 4> rb;
  CHECK(rb.empty() == true);
  CHECK(rb.size() == 0);
  TestFrame out;
  CHECK(rb.pop(out) == false);
}

TEST_CASE("push then pop: FIFO order and size accounting") {
  FrameRingBuffer<TestFrame, 4> rb;
  rb.push({1, 1.0f});
  rb.push({2, 2.0f});
  rb.push({3, 3.0f});
  CHECK(rb.size() == 3);
  CHECK(rb.empty() == false);

  TestFrame f;
  REQUIRE(rb.pop(f));
  CHECK(f.id == 1);
  REQUIRE(rb.pop(f));
  CHECK(f.id == 2);
  REQUIRE(rb.pop(f));
  CHECK(f.id == 3);
  CHECK(rb.empty() == true);
  CHECK(rb.pop(f) == false);
}

TEST_CASE("overflow drops the oldest, keeps the newest N") {
  // Capacity 3: pushing 5 should leave us with frames 3,4,5 (not 1,2,3).
  // Dropping the oldest matches the original behaviour the ring buffer
  // replaces — only now the loss is bounded and reported rather than
  // silently overwriting the single in-flight frame each time.
  FrameRingBuffer<TestFrame, 3> rb;
  rb.push({1, 0});
  rb.push({2, 0});
  rb.push({3, 0});
  rb.push({4, 0});  // drops 1
  rb.push({5, 0});  // drops 2
  CHECK(rb.size() == 3);

  TestFrame f;
  REQUIRE(rb.pop(f));
  CHECK(f.id == 3);
  REQUIRE(rb.pop(f));
  CHECK(f.id == 4);
  REQUIRE(rb.pop(f));
  CHECK(f.id == 5);
  CHECK(rb.empty() == true);
}

TEST_CASE("push reports whether overflow occurred") {
  // The producer can use the return value to bump a "frames dropped"
  // counter for diagnostics.
  FrameRingBuffer<TestFrame, 2> rb;
  CHECK(rb.push({1, 0}) == true);   // no drop
  CHECK(rb.push({2, 0}) == true);   // no drop
  CHECK(rb.push({3, 0}) == false);  // dropped frame 1
  CHECK(rb.push({4, 0}) == false);  // dropped frame 2
  CHECK(rb.size() == 2);
}

TEST_CASE("interleaved push/pop keeps wrap-around correct") {
  // Exercises the head/tail wrap. With capacity 3 and 10 push/pop cycles
  // we'd land at any internal index — verify the logical FIFO is intact
  // throughout.
  FrameRingBuffer<TestFrame, 3> rb;
  for (int i = 0; i < 10; ++i) {
    rb.push({i, 0});
    TestFrame f;
    REQUIRE(rb.pop(f));
    CHECK(f.id == i);
    CHECK(rb.empty() == true);
  }
}

TEST_CASE("interleaved with partial drain stays in FIFO order") {
  FrameRingBuffer<TestFrame, 4> rb;
  rb.push({1, 0});
  rb.push({2, 0});
  TestFrame f;
  REQUIRE(rb.pop(f));
  CHECK(f.id == 1);
  rb.push({3, 0});
  rb.push({4, 0});
  rb.push({5, 0});  // buffer now [2,3,4,5]
  CHECK(rb.size() == 4);

  REQUIRE(rb.pop(f)); CHECK(f.id == 2);
  REQUIRE(rb.pop(f)); CHECK(f.id == 3);
  REQUIRE(rb.pop(f)); CHECK(f.id == 4);
  REQUIRE(rb.pop(f)); CHECK(f.id == 5);
  CHECK(rb.empty() == true);
}

TEST_CASE("buffer of capacity 1 still works (degenerate but valid)") {
  // The minimum useful capacity. Pushing a second frame drops the first.
  FrameRingBuffer<TestFrame, 1> rb;
  CHECK(rb.push({10, 0}) == true);
  CHECK(rb.push({11, 0}) == false);
  CHECK(rb.size() == 1);
  TestFrame f;
  REQUIRE(rb.pop(f));
  CHECK(f.id == 11);
  CHECK(rb.empty() == true);
}
