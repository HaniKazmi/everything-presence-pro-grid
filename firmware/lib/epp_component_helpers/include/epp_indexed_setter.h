#pragma once
//
// set_at: bounds-clamped indexed assignment for fixed-size C arrays.
//
// Item L4 (PR-8): EPPComponent had eleven setter methods that all inlined the
// same '(index >= 0 && index < N) ? arr[index] = value : noop' pattern,
// differing only in array name and bound. Replace each with a one-liner
// `set_at(arr_, index, value);` — N is deduced from the array's static type.
//
// The bounds-clamp is intentional: ESPHome codegen calls these setters with
// generated indices and we don't want a malformed yaml to UB-trash adjacent
// fields. Silent no-op on out-of-range matches the prior inline behaviour.

#include <cstddef>

namespace epp {

template <typename T, std::size_t N>
inline void set_at(T (&arr)[N], int index, T value) {
  if (index < 0 || static_cast<std::size_t>(index) >= N) return;
  arr[index] = value;
}

}  // namespace epp
