// Tests for BoundedWriter — a tiny printf wrapper that maintains a running
// position into a fixed buffer and refuses to underflow on overflow.
//
// Item H5 (PR-8): the zone-state JSON assembly in epp_component.cpp used the
// pattern `pos += snprintf(buf + pos, sizeof(buf) - pos, ...)`. If pos ever
// reaches or exceeds sizeof(buf), the (size_t)(sizeof(buf) - pos) subtraction
// underflows to a huge value and the next snprintf writes past the end.
//
// BoundedWriter encapsulates the bounds check: once the cumulative would-have-
// written length exceeds the buffer, further printf calls become no-ops and
// ok() returns false so the caller can log a warning. The underlying buffer
// always remains null-terminated.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include <cstring>
#include <string>

#include "epp_json_writer.h"

using namespace epp;

TEST_CASE("BoundedWriter: empty after construction is ok with empty content") {
  char buf[16];
  BoundedWriter w(buf, sizeof(buf));
  CHECK(w.ok() == true);
  CHECK(w.size() == 0);
  CHECK(std::strcmp(buf, "") == 0);
}

TEST_CASE("BoundedWriter: single printf inside the buffer succeeds") {
  char buf[32];
  BoundedWriter w(buf, sizeof(buf));
  w.printf("hello %d", 42);
  CHECK(w.ok() == true);
  CHECK(w.size() == 8);
  CHECK(std::strcmp(buf, "hello 42") == 0);
}

TEST_CASE("BoundedWriter: chained printfs accumulate correctly") {
  char buf[64];
  BoundedWriter w(buf, sizeof(buf));
  w.printf("{");
  w.printf("\"a\":%d", 1);
  w.printf(",\"b\":%s", "two");
  w.printf("}");
  CHECK(w.ok() == true);
  CHECK(std::strcmp(buf, "{\"a\":1,\"b\":two}") == 0);
}

TEST_CASE("BoundedWriter: overflow by exactly 1 is detected and reported") {
  // Buffer holds 8 chars + null = 9 bytes. "1234567" is 7 chars (fits).
  // Adding one more char would write the 9th byte past the null slot.
  char buf[9];
  BoundedWriter w(buf, sizeof(buf));
  w.printf("1234567");
  CHECK(w.ok() == true);
  CHECK(w.size() == 7);
  // This call wants to write "8" — that needs 1 char + null = 2 bytes, but
  // only 1 byte (the null slot) remains. Mark truncated.
  w.printf("89");
  CHECK(w.ok() == false);
}

TEST_CASE("BoundedWriter: overflow by many is detected") {
  char buf[8];
  BoundedWriter w(buf, sizeof(buf));
  w.printf("this string is way too long for the buffer");
  CHECK(w.ok() == false);
  // Buffer must remain null-terminated even after overflow.
  CHECK(buf[sizeof(buf) - 1] == '\0');
}

TEST_CASE("BoundedWriter: after overflow, further printfs are no-ops") {
  char buf[8];
  BoundedWriter w(buf, sizeof(buf));
  w.printf("12345678901234");  // overflow
  CHECK(w.ok() == false);
  // A subsequent successful-looking printf must not silently re-set ok().
  w.printf("x");
  CHECK(w.ok() == false);
}

TEST_CASE("BoundedWriter: format-string pass-through works for varied types") {
  char buf[64];
  BoundedWriter w(buf, sizeof(buf));
  w.printf("int=%d float=%.1f str=%s char=%c hex=%x",
           7, 3.14f, "ok", 'Z', 0xab);
  CHECK(w.ok() == true);
  CHECK(std::strcmp(buf, "int=7 float=3.1 str=ok char=Z hex=ab") == 0);
}

TEST_CASE("BoundedWriter: zero-byte buffer is degenerate but doesn't crash") {
  // Defensive: a 0-size construction must not write anywhere. ok() is false
  // because we can't even null-terminate.
  BoundedWriter w(nullptr, 0);
  w.printf("anything");
  CHECK(w.ok() == false);
  CHECK(w.size() == 0);
}

TEST_CASE("BoundedWriter: snprintf-style return-value semantics") {
  // Writing exactly `total - 1` chars should leave us with size() == total - 1
  // and the buffer null-terminated at position total-1.
  char buf[6];
  BoundedWriter w(buf, sizeof(buf));
  w.printf("abcde");
  CHECK(w.ok() == true);
  CHECK(w.size() == 5);
  CHECK(std::strcmp(buf, "abcde") == 0);
}
