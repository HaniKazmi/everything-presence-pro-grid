#pragma once
//
// Single-producer / single-consumer ring buffer for parsed sensor frames.
//
// Use case: the LD2450 UART lambda (producer) calls feed_targets() and
// EPPComponent::loop() (consumer) drains the buffer once per ESPHome tick.
// Both run on the same FreeRTOS task in practice, so we don't need atomics
// or locks. The ring buffer's purpose is robustness against scheduling jitter
// rather than true cross-thread safety: if loop() runs late and a second
// frame arrives, the older one is preserved instead of being silently
// stomped.
//
// Capacity policy on overflow: drop the oldest frame and accept the new one.
// This matches the previous behaviour (older frame lost) but the loss is now
// bounded — at most CAPACITY-1 backed-up frames are kept and the producer
// learns it dropped a frame via push()'s return value, useful for diagnostics.
//
// Storage is in-place — `Frame` instances are copy-assigned by push and copy
// out by pop. Suitable for small POD-ish frame types.

#include <cstddef>
#include <cstdint>

namespace epp {

template <typename Frame, size_t CAPACITY>
class FrameRingBuffer {
  static_assert(CAPACITY >= 1, "FrameRingBuffer needs capacity of at least 1");

 public:
  FrameRingBuffer() = default;

  /// Push a frame onto the buffer. If full, drops the oldest entry to make
  /// room. Returns true if no frame was dropped, false if overflow occurred.
  bool push(const Frame &frame) {
    bool overflow = false;
    if (size_ == CAPACITY) {
      // Buffer full — drop the oldest by advancing tail before writing.
      tail_ = (tail_ + 1) % CAPACITY;
      // size_ stays at CAPACITY since we're replacing one slot.
      overflow = true;
    } else {
      size_++;
    }
    buffer_[head_] = frame;
    head_ = (head_ + 1) % CAPACITY;
    return !overflow;
  }

  /// Pop the oldest frame into `out`. Returns false if the buffer is empty.
  bool pop(Frame &out) {
    if (size_ == 0) return false;
    out = buffer_[tail_];
    tail_ = (tail_ + 1) % CAPACITY;
    size_--;
    return true;
  }

  bool empty() const { return size_ == 0; }
  size_t size() const { return size_; }
  static constexpr size_t capacity() { return CAPACITY; }

 private:
  Frame buffer_[CAPACITY]{};
  size_t head_ = 0;  // next write index
  size_t tail_ = 0;  // next read index
  size_t size_ = 0;
};

}  // namespace epp
