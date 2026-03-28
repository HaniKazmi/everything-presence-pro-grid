# C++ Coverage Enforcement Design

**Date**: 2026-03-28
**Approach**: gcov + lcov

## Context

The C++ zone engine library has 75 tests across 6 test files, all passing.
However, there is no coverage measurement, no coverage threshold enforcement,
and the C++ tests are not included in the pre-push hook or CI coverage gates.

The Python and TypeScript layers already enforce coverage thresholds:
- Python: 70% via `--cov-fail-under=70` in pre-push
- TypeScript: 90% lines, 90% functions, 90% statements, 85% branches via vitest

## Goal

Add C++ line coverage measurement and enforce a 90% threshold in both the
pre-push hook and CI, consistent with the TypeScript coverage standard.

## Design

### 1. CMake: Coverage build type

Add `--coverage` flags when `CMAKE_BUILD_TYPE=Coverage` in
`firmware/lib/epp_zone_engine/CMakeLists.txt`:

```cmake
if(CMAKE_BUILD_TYPE STREQUAL "Coverage")
    add_compile_options(--coverage)
    add_link_options(--coverage)
endif()
```

This instruments the compiled code with gcov counters. No impact on default
Debug/Release builds.

### 2. Pre-push hook: C++ section

Add a "C++ tests + coverage" section to `.git/hooks/pre-push`, placed between
the Python and TypeScript sections. The flow:

1. `cmake -B build-coverage -DCMAKE_BUILD_TYPE=Coverage` (in `firmware/lib/epp_zone_engine/`)
2. `cmake --build build-coverage`
3. `ctest --test-dir build-coverage --output-on-failure`
4. `lcov --capture --directory build-coverage --output-file coverage.info`
5. `lcov --remove coverage.info` to exclude:
   - `*/tests/*` (test files)
   - `*/_deps/*` (doctest, nlohmann/json)
   - `*/tools/*` (replay tool)
6. Parse line coverage percentage from `lcov --summary`
7. Fail if line coverage < 90%
8. Clean up `build-coverage/`, `coverage.info`

The build directory is `build-coverage` (not `build`) to avoid colliding with
any existing debug build.

If `lcov` is not installed, the hook should skip the coverage check with a
warning (not a hard failure), since the CI enforces coverage anyway. This
avoids blocking pushes for contributors who haven't installed lcov locally.
The tests themselves still run and must pass.

### 3. CI: tests.yml cpp job

Update the `cpp` job in `.github/workflows/tests.yml`:

1. Install lcov: `sudo apt-get install -y cmake lcov`
2. Build with coverage: `cmake -B build -DCMAKE_BUILD_TYPE=Coverage`
3. Run tests: `ctest --test-dir build --output-on-failure`
4. Capture coverage: `lcov --capture --directory build --output-file coverage.info`
5. Filter out test/dep files (same excludes as pre-push)
6. Enforce threshold: parse `lcov --summary` output, fail if < 90%
7. Generate HTML report: `genhtml coverage.info -o coverage-html`
8. Upload as GitHub Actions artifact

### 4. Coverage scope

**Included** (5 source files):
- `src/epp_grid.cpp`
- `src/epp_calibration.cpp`
- `src/epp_tumbling_window.cpp`
- `src/epp_rolling_window.cpp`
- `src/epp_zone_engine.cpp`

**Excluded**:
- `tests/*` — test files themselves
- `_deps/*` — doctest framework, nlohmann/json
- `tools/*` — replay tool (host utility, not core library)

### 5. .gitignore

Add `build-coverage/` to prevent accidental commits of coverage build artifacts.

### 6. Threshold

90% line coverage, matching the TypeScript standard. The pre-push hook and CI
both enforce the same threshold.
