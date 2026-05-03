#pragma once
//
// BoundedWriter — small wrapper around vsnprintf that maintains a running
// position into a fixed buffer and refuses to underflow on overflow.
//
// Item H5 (PR-8): the zone-state JSON assembly previously used the unsafe
// pattern:
//
//   pos += snprintf(buf + pos, sizeof(buf) - pos, ...);
//
// If pos ever reaches or exceeds sizeof(buf), the (size_t)(sizeof(buf) - pos)
// subtraction underflows to a huge value and the next snprintf writes far
// past the end. This helper encapsulates the bounds check so callers can't
// trip it accidentally:
//
//   BoundedWriter w(buf, sizeof(buf));
//   w.printf("{");
//   w.printf("...");
//   if (!w.ok()) { ESP_LOGW(TAG, "JSON truncated"); }
//
// Once truncated, the writer becomes a no-op — every subsequent printf is
// dropped and ok() stays false. The underlying buffer is always
// null-terminated as long as total_ >= 1.

#include <cstdarg>
#include <cstddef>
#include <cstdio>

namespace epp {

class BoundedWriter {
 public:
  BoundedWriter(char *buf, size_t total) : buf_(buf), total_(total) {
    if (buf_ != nullptr && total_ > 0) {
      buf_[0] = '\0';
    } else {
      // Degenerate construction (null buffer or zero total) — any printf is
      // a no-op and ok() reports failure. Caller probably has a bug.
      ok_ = false;
    }
  }

  /// Append a printf-formatted string to the buffer. Once ok() has gone
  /// false this becomes a no-op so chained writes after truncation are safe
  /// to leave in place — useful for keeping the calling code linear.
  void printf(const char *fmt, ...) {
    if (!ok_) return;
    size_t remaining = total_ - pos_;
    if (remaining == 0) {
      // Buffer is already full to capacity (only the null terminator slot).
      ok_ = false;
      return;
    }
    va_list ap;
    va_start(ap, fmt);
    int written = std::vsnprintf(buf_ + pos_, remaining, fmt, ap);
    va_end(ap);
    if (written < 0) {
      // Encoding error — give up.
      ok_ = false;
      return;
    }
    if ((size_t)written >= remaining) {
      // Output was truncated (or would have overflowed). Saturate pos_ to
      // the last writable byte and mark not-ok.
      pos_ = total_ - 1;
      ok_ = false;
      return;
    }
    pos_ += (size_t)written;
  }

  /// True until any printf call hits the buffer limit.
  bool ok() const { return ok_; }

  /// Number of payload bytes written so far (excluding null terminator).
  size_t size() const { return pos_; }

  /// Pointer to the underlying buffer (always null-terminated when ok-ish).
  const char *c_str() const { return buf_; }

 private:
  char *buf_;
  size_t total_;
  size_t pos_ = 0;
  bool ok_ = true;
};

}  // namespace epp
