// Tests for the set_at indexed-setter helper.
//
// Item L4 (PR-8): EPPComponent's header had eleven setter methods that all
// inlined the same '(index >= 0 && index < N) arr[index] = value' bounds-clamp
// pattern, differing only in array name + bound. Replace with a single
// template that derives N from the array's static type.

#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>

#include "epp_indexed_setter.h"

using namespace epp;

TEST_CASE("set_at: stores value at valid index") {
  int arr[5]{};
  set_at(arr, 0, 42);
  CHECK(arr[0] == 42);

  set_at(arr, 4, 99);
  CHECK(arr[4] == 99);
}

TEST_CASE("set_at: replaces existing value") {
  int arr[3]{1, 2, 3};
  set_at(arr, 1, 999);
  CHECK(arr[1] == 999);
  // unchanged neighbours
  CHECK(arr[0] == 1);
  CHECK(arr[2] == 3);
}

TEST_CASE("set_at: negative index is a no-op") {
  int arr[3]{10, 20, 30};
  set_at(arr, -1, 999);
  CHECK(arr[0] == 10);
  CHECK(arr[1] == 20);
  CHECK(arr[2] == 30);
}

TEST_CASE("set_at: index >= N is a no-op") {
  int arr[3]{10, 20, 30};
  set_at(arr, 3, 999);
  set_at(arr, 100, 999);
  CHECK(arr[0] == 10);
  CHECK(arr[1] == 20);
  CHECK(arr[2] == 30);
}

TEST_CASE("set_at: works with pointer arrays (the EPPComponent use case)") {
  int sentinel_a = 1, sentinel_b = 2;
  int *arr[4]{nullptr, nullptr, nullptr, nullptr};

  set_at(arr, 0, &sentinel_a);
  set_at(arr, 3, &sentinel_b);
  CHECK(arr[0] == &sentinel_a);
  CHECK(arr[1] == nullptr);
  CHECK(arr[2] == nullptr);
  CHECK(arr[3] == &sentinel_b);

  // Out-of-range setter doesn't mutate
  set_at(arr, 4, &sentinel_a);
  CHECK(arr[0] == &sentinel_a);  // unchanged
}

TEST_CASE("set_at: single-slot array") {
  int arr[1]{};
  set_at(arr, 0, 7);
  CHECK(arr[0] == 7);
  set_at(arr, 1, 999);
  CHECK(arr[0] == 7);  // unchanged
}
