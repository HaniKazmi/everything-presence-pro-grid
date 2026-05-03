#pragma once
//
// parse_perspective_coefficients — strict comma-separated 8-float parser.
//
// Item H3 (PR-8): the previous EPPComponent::set_perspective parser walked
// strtof + comma in a hand-rolled loop with no validation:
//   - Extra commas were silently swallowed ("1,,2" parsed as 1, 2).
//   - NaN / +/-inf coefficients were accepted and installed as calibration.
//   - Trailing garbage after the 8th coefficient was discarded silently.
//
// The replacement requires:
//   - Exactly 8 floats.
//   - Each value passes std::isfinite (rejects NaN and +/-inf, including
//     overflows like 1e9999 that strtof maps to HUGE_VALF).
//   - No empty fields (consecutive commas / leading / trailing commas).
//   - No trailing garbage after the 8th float (whitespace is OK).
//
// Returns true only on a clean parse. Caller is responsible for any logging.

#include <cctype>
#include <cmath>
#include <cstdlib>
#include <string>

namespace epp {

inline bool parse_perspective_coefficients(const std::string &input,
                                           float out[8]) {
  const char *p = input.c_str();

  // Reject leading whitespace + immediate comma (empty first field) or
  // a fully empty / whitespace-only string. strtof's own whitespace skip
  // would mask the latter as "no conversion" rather than "empty".
  while (*p != '\0' && std::isspace(static_cast<unsigned char>(*p))) p++;
  if (*p == '\0' || *p == ',') return false;

  for (int i = 0; i < 8; i++) {
    char *end = nullptr;
    float v = std::strtof(p, &end);
    if (end == p) {
      // No conversion happened — empty field or garbage where we wanted
      // a number.
      return false;
    }
    if (!std::isfinite(v)) {
      // NaN, +/-infinity, or strtof overflow (HUGE_VALF) all fail here.
      return false;
    }
    out[i] = v;
    p = end;

    // Skip whitespace between the value and the next separator (or EOS).
    while (*p != '\0' && std::isspace(static_cast<unsigned char>(*p))) p++;

    if (i < 7) {
      // Need a comma followed by a non-comma, non-EOS, non-whitespace-then-EOS
      // start of the next field. A trailing comma at i==6 (last separator)
      // with nothing after is still rejected by the next iteration's
      // empty-field check.
      if (*p != ',') return false;
      p++;  // consume the comma
      // Don't skip whitespace here — strtof handles that. But we DO need to
      // peek for double-commas and end-of-string immediately after the comma.
      const char *q = p;
      while (*q != '\0' && std::isspace(static_cast<unsigned char>(*q))) q++;
      if (*q == '\0' || *q == ',') return false;
    }
  }

  // After the 8th value, only trailing whitespace is allowed. A trailing
  // comma here would mean a phantom 9th empty field; non-whitespace text
  // means garbage at the end (e.g. "1,2,3,4,5,6,7,8,9" or "...,8x").
  while (*p != '\0' && std::isspace(static_cast<unsigned char>(*p))) p++;
  if (*p != '\0') return false;

  return true;
}

}  // namespace epp
