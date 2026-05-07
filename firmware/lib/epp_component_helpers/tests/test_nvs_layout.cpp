// Tests for NVS layout constants.
//
// GRID_BLOB_SIZE replaces hardcoded `408` in epp_component.cpp. The
// static_assert in the header is a compile-time check; the runtime test here
// pins the numeric value so a future GRID_COLS/ROWS change can't silently
// drift the on-flash blob layout without a deliberate decision.
//
// NVS_SCHEMA_VERSION gates the entire stored blob set: bumping it causes
// restore_from_nvs_ to erase the namespace on next boot. The integration with
// ESP-IDF's NVS handle is host-untestable; only the constant invariants are
// pinned here.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "epp_nvs_layout.h"
#include "epp_types.h"

using namespace epp;

TEST_CASE("GRID_BLOB_SIZE matches the on-flash layout (400 cells + 2 floats)") {
  // Pin the numeric size. If GRID_COLS/ROWS changes, this test fails first
  // and forces an explicit decision about the on-flash layout.
  CHECK(GRID_BLOB_SIZE == 408);
  CHECK(GRID_BLOB_SIZE == GRID_CELL_COUNT + 2 * sizeof(float));
}

TEST_CASE("NVS_SCHEMA_VERSION is positive (zero is the absent-key sentinel)") {
  // nvs_get_u8 leaves the caller's variable at its initial 0 when the key is
  // absent, so the first valid schema version must be >= 1.
  CHECK(NVS_SCHEMA_VERSION >= 1);
}

TEST_CASE("GRID_BASE64_MAX bounds the API service input to a reasonable size") {
  // Item H4 (PR-8): set_grid receives a base64 string from the API service.
  // Without an explicit cap a buggy or malicious caller could send a huge
  // payload that std::string would happily allocate before mbedtls_base64_decode
  // refuses to decode it. We cap at the size of a fully-padded base64 encoding
  // of GRID_CELL_COUNT bytes (plus a tiny slack for trailing whitespace).

  // Standard base64 expansion is ceil(n/3)*4. For 400 bytes that's 536.
  CHECK(GRID_BASE64_MAX >= 536);
  // And the slack must keep it under a small constant — definitely well below
  // 1KB. If this trips after a GRID_COLS/ROWS bump, revisit the slack budget.
  CHECK(GRID_BASE64_MAX <= 1024);
}
