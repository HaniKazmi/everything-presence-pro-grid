# Firmware Phase 1: Import & Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the Everything Presence Pro ESPHome firmware into the eppgrid monorepo with CI compilation of all 8 variants, and scaffold the empty C++ zone engine library and ESPHome component.

**Architecture:** The firmware YAML files move from the standalone fork repo (`everything-presence-pro/`) into `firmware/` within the eppgrid monorepo. Variant YAMLs adjust their `!include` paths from `common/` to `../common/`. An empty C++ library and ESPHome external component are scaffolded so that the firmware compiles with our custom component structure from day one. CI gains a firmware compile job.

**Tech Stack:** ESPHome (YAML + ESP-IDF), C++ (doctest for host tests, CMake), GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-24-firmware-integration-design.md`

**Working directory:** All commands run from the eppgrid repo root: `/workspaces/ha-dev/everything-presence-pro-grid/.worktrees/firmware/`

**Note on file naming:** The C++ library uses an `epp_` prefix on all header/source files (e.g., `epp_grid.h` instead of `grid.h`). This is intentional — it avoids name collisions when ESPHome includes them alongside its own headers. The spec's directory tree shows the logical names; the actual files use the prefixed form.

---

## File Structure

### New Files — Firmware YAML (copied from fork, paths adjusted)

- `firmware/common/everything-presence-pro-base.yaml` — Core API, I2C, PIR, sensors, LED, relay
- `firmware/common/ld2450-base.yaml` — LD2450 mmWave UART driver
- `firmware/common/sen0609-base.yaml` — SEN0609 static presence UART driver
- `firmware/common/co2-base.yaml` — SCD4x CO2 sensor
- `firmware/common/bluetooth-base.yaml` — BLE proxy
- `firmware/common/ethernet-base.yaml` — LAN8720 ethernet
- `firmware/variants/wifi.yaml` — WiFi-only variant entry point
- `firmware/variants/wifi-ble.yaml` — WiFi + BLE variant
- `firmware/variants/wifi-co2.yaml` — WiFi + CO2 variant
- `firmware/variants/wifi-ble-co2.yaml` — WiFi + BLE + CO2 variant
- `firmware/variants/ethernet.yaml` — Ethernet-only variant
- `firmware/variants/ethernet-ble.yaml` — Ethernet + BLE variant
- `firmware/variants/ethernet-co2.yaml` — Ethernet + CO2 variant
- `firmware/variants/ethernet-ble-co2.yaml` — Ethernet + BLE + CO2 variant

### New Files — C++ Zone Engine Library (scaffold)

- `firmware/lib/epp_zone_engine/CMakeLists.txt` — Build config for library + tests
- `firmware/lib/epp_zone_engine/include/epp_types.h` — Shared type definitions
- `firmware/lib/epp_zone_engine/include/epp_grid.h` — Grid class header
- `firmware/lib/epp_zone_engine/include/epp_tumbling_window.h` — TumblingWindow header
- `firmware/lib/epp_zone_engine/include/epp_zone_engine.h` — ZoneEngine header
- `firmware/lib/epp_zone_engine/include/epp_calibration.h` — SensorTransform header
- `firmware/lib/epp_zone_engine/src/epp_grid.cpp` — Grid stub
- `firmware/lib/epp_zone_engine/src/epp_tumbling_window.cpp` — TumblingWindow stub
- `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp` — ZoneEngine stub
- `firmware/lib/epp_zone_engine/src/epp_calibration.cpp` — SensorTransform stub
- `firmware/lib/epp_zone_engine/tests/test_grid.cpp` — Minimal passing test
- `firmware/lib/epp_zone_engine/tests/CMakeLists.txt` — Test build config

### New Files — ESPHome External Component (scaffold)

- `firmware/components/epp/__init__.py` — ESPHome component registration (empty)
- `firmware/components/epp/epp_component.h` — Component header (stub)
- `firmware/components/epp/epp_component.cpp` — Component source (stub)

### New Files — CI

- `.github/workflows/firmware.yml` — Firmware compile job (all 8 variants)

### Modified Files

- `.gitignore` — Add ESPHome build artifacts (`firmware/.esphome/`, `firmware/build/`)

---

## Tasks

### Task 1: Copy firmware YAML base configs

**Files:**
- Create: `firmware/common/everything-presence-pro-base.yaml`
- Create: `firmware/common/ld2450-base.yaml`
- Create: `firmware/common/sen0609-base.yaml`
- Create: `firmware/common/co2-base.yaml`
- Create: `firmware/common/bluetooth-base.yaml`
- Create: `firmware/common/ethernet-base.yaml`

- [ ] **Step 1: Create firmware directories**

```bash
mkdir -p firmware/common firmware/variants firmware/lib firmware/components
```

- [ ] **Step 2: Copy base YAML files**

```bash
cp /workspaces/ha-dev/everything-presence-pro/common/everything-presence-pro-base.yaml firmware/common/
cp /workspaces/ha-dev/everything-presence-pro/common/ld2450-base.yaml firmware/common/
cp /workspaces/ha-dev/everything-presence-pro/common/sen0609-base.yaml firmware/common/
cp /workspaces/ha-dev/everything-presence-pro/common/co2-base.yaml firmware/common/
cp /workspaces/ha-dev/everything-presence-pro/common/bluetooth-base.yaml firmware/common/
cp /workspaces/ha-dev/everything-presence-pro/common/ethernet-base.yaml firmware/common/
```

- [ ] **Step 3: Verify all 6 files copied**

```bash
ls firmware/common/
```

Expected: 6 YAML files listed.

- [ ] **Step 4: Commit**

```bash
git add firmware/common/
git commit -m "Import firmware base YAML configs from EPP fork"
```

---

### Task 2: Copy and adjust variant YAMLs

Each variant YAML includes packages with `!include common/foo.yaml`. Since variants move to `firmware/variants/` and base configs are at `firmware/common/`, the include paths change to `../common/foo.yaml`.

Also update `dashboard_import` URL to point to our repo, and `update` source URL placeholder (will be finalized in Phase 5).

**Files:**
- Create: `firmware/variants/wifi.yaml`
- Create: `firmware/variants/wifi-ble.yaml`
- Create: `firmware/variants/wifi-co2.yaml`
- Create: `firmware/variants/wifi-ble-co2.yaml`
- Create: `firmware/variants/ethernet.yaml`
- Create: `firmware/variants/ethernet-ble.yaml`
- Create: `firmware/variants/ethernet-co2.yaml`
- Create: `firmware/variants/ethernet-ble-co2.yaml`

- [ ] **Step 1: Copy all 8 variant YAMLs**

```bash
for f in /workspaces/ha-dev/everything-presence-pro/everything-presence-pro-*.yaml; do
  base=$(basename "$f" | sed 's/everything-presence-pro-//')
  cp "$f" "firmware/variants/$base"
done
```

- [ ] **Step 2: Fix include paths in all variants**

In each variant YAML, replace `!include common/` with `!include ../common/`:

```bash
sed -i 's|!include common/|!include ../common/|g' firmware/variants/*.yaml
```

- [ ] **Step 3: Update dashboard_import URLs**

Replace the EverythingSmart GitHub URL with our repo URL in all variants:

```bash
sed -i 's|github://everythingsmarthome/everything-presence-pro/everything-presence-pro-|github://clintongormley/everything-presence-pro-grid/firmware/variants/|g' firmware/variants/*.yaml
```

- [ ] **Step 4: Neutralize OTA update URLs**

The original variants point to EverythingSmart's OTA server. Comment these out to prevent devices from pulling wrong firmware. OTA will be finalized in Phase 5.

```bash
sed -i '/^update:/,/^$/s/^/#/' firmware/variants/*.yaml
```

This comments out the `update:` block in each variant. Verify:

```bash
grep -A2 'update:' firmware/variants/wifi.yaml
```

Expected: lines are commented out with `#`.

- [ ] **Step 5: Verify include paths are correct**

```bash
grep '!include' firmware/variants/*.yaml
```

Expected: All includes show `../common/` prefix.

- [ ] **Step 6: Verify all 8 variants exist**

```bash
ls firmware/variants/
```

Expected: 8 YAML files (wifi.yaml, wifi-ble.yaml, wifi-co2.yaml, wifi-ble-co2.yaml, ethernet.yaml, ethernet-ble.yaml, ethernet-co2.yaml, ethernet-ble-co2.yaml).

- [ ] **Step 7: Commit**

```bash
git add firmware/variants/
git commit -m "Import firmware variant YAMLs with adjusted include paths"
```

---

### Task 3: Scaffold C++ zone engine library

Create the empty library structure with build system and one minimal test to prove the toolchain works.

**Files:**
- Create: `firmware/lib/epp_zone_engine/CMakeLists.txt`
- Create: `firmware/lib/epp_zone_engine/include/epp_types.h`
- Create: `firmware/lib/epp_zone_engine/include/epp_grid.h`
- Create: `firmware/lib/epp_zone_engine/include/epp_tumbling_window.h`
- Create: `firmware/lib/epp_zone_engine/include/epp_zone_engine.h`
- Create: `firmware/lib/epp_zone_engine/include/epp_calibration.h`
- Create: `firmware/lib/epp_zone_engine/src/epp_grid.cpp`
- Create: `firmware/lib/epp_zone_engine/src/epp_tumbling_window.cpp`
- Create: `firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp`
- Create: `firmware/lib/epp_zone_engine/src/epp_calibration.cpp`
- Create: `firmware/lib/epp_zone_engine/tests/CMakeLists.txt`
- Create: `firmware/lib/epp_zone_engine/tests/test_grid.cpp`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p firmware/lib/epp_zone_engine/{include,src,tests}
```

- [ ] **Step 2: Create the library CMakeLists.txt**

`firmware/lib/epp_zone_engine/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.14)
project(epp_zone_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Library
add_library(epp_zone_engine
    src/epp_grid.cpp
    src/epp_tumbling_window.cpp
    src/epp_zone_engine.cpp
    src/epp_calibration.cpp
)
target_include_directories(epp_zone_engine PUBLIC include)

# Tests
option(EPP_BUILD_TESTS "Build tests" ON)
if(EPP_BUILD_TESTS)
    include(FetchContent)
    FetchContent_Declare(
        doctest
        GIT_REPOSITORY https://github.com/doctest/doctest.git
        GIT_TAG v2.4.11
    )
    FetchContent_MakeAvailable(doctest)

    add_subdirectory(tests)
endif()
```

- [ ] **Step 3: Create the test CMakeLists.txt**

`firmware/lib/epp_zone_engine/tests/CMakeLists.txt`:

```cmake
add_executable(epp_tests
    test_grid.cpp
)
target_link_libraries(epp_tests PRIVATE epp_zone_engine doctest::doctest)

include(${doctest_SOURCE_DIR}/scripts/cmake/doctest.cmake)
doctest_discover_tests(epp_tests)
```

- [ ] **Step 4: Create shared types header**

`firmware/lib/epp_zone_engine/include/epp_types.h`:

```cpp
#pragma once

#include <cstdint>
#include <array>

namespace epp {

// Grid constants — must match Python const.py and TypeScript grid.ts
constexpr int GRID_COLS = 20;
constexpr int GRID_ROWS = 20;
constexpr int GRID_CELL_COUNT = GRID_COLS * GRID_ROWS;
constexpr int GRID_CELL_SIZE_MM = 300;

// Cell byte encoding
constexpr uint8_t CELL_ROOM_BIT = 0x01;
constexpr int CELL_ZONE_SHIFT = 1;
constexpr uint8_t CELL_ZONE_MASK = 0x0E;
constexpr uint8_t CELL_TRAINING_MASK = 0xF0;
constexpr int CELL_TRAINING_SHIFT = 4;

// Limits
constexpr int MAX_TARGETS = 3;
constexpr int MAX_ZONES = 7;  // named zones 1-7; zone 0 is implicit rest-of-room
constexpr int MAX_ZONE_SLOTS = 8;  // zone 0 + zones 1-7
constexpr int MAX_MOVEMENT_CELLS = 5;  // continuity Chebyshev threshold
constexpr int RAW_FPS = 10;  // expected frames per second from LD2450

// Target status
enum class TargetStatus : uint8_t {
    INACTIVE = 0,
    ACTIVE = 1,
    PENDING = 2,
};

// Zone state
enum class ZoneState : uint8_t {
    CLEAR = 0,
    OCCUPIED = 1,
    PENDING_CLEAR = 2,
};

}  // namespace epp
```

- [ ] **Step 5: Create stub header files**

`firmware/lib/epp_zone_engine/include/epp_grid.h`:

```cpp
#pragma once

#include "epp_types.h"

namespace epp {

class Grid {
public:
    Grid() = default;

    // Placeholder — will be implemented in Phase 2
    int xy_to_cell(float x, float y) const;

private:
    std::array<uint8_t, GRID_CELL_COUNT> cells_{};
    float origin_x_ = 0.0f;
    float origin_y_ = 0.0f;
};

}  // namespace epp
```

`firmware/lib/epp_zone_engine/include/epp_tumbling_window.h`:

```cpp
#pragma once

#include "epp_types.h"

namespace epp {

class TumblingWindow {
public:
    TumblingWindow() = default;
    // Placeholder — will be implemented in Phase 2
};

}  // namespace epp
```

`firmware/lib/epp_zone_engine/include/epp_zone_engine.h`:

```cpp
#pragma once

#include "epp_types.h"

namespace epp {

class ZoneEngine {
public:
    ZoneEngine() = default;
    // Placeholder — will be implemented in Phase 2
};

}  // namespace epp
```

`firmware/lib/epp_zone_engine/include/epp_calibration.h`:

```cpp
#pragma once

#include "epp_types.h"
#include <array>

namespace epp {

class SensorTransform {
public:
    SensorTransform() = default;
    // Placeholder — will be implemented in Phase 2

private:
    std::array<float, 8> coeffs_{};
    float room_width_ = 0.0f;
    float room_depth_ = 0.0f;
};

}  // namespace epp
```

- [ ] **Step 6: Create stub source files**

`firmware/lib/epp_zone_engine/src/epp_grid.cpp`:

```cpp
#include "epp_grid.h"

namespace epp {

int Grid::xy_to_cell(float /*x*/, float /*y*/) const {
    return -1;  // Stub — will be implemented in Phase 2
}

}  // namespace epp
```

`firmware/lib/epp_zone_engine/src/epp_tumbling_window.cpp`:

```cpp
#include "epp_tumbling_window.h"

namespace epp {
// Stub — will be implemented in Phase 2
}  // namespace epp
```

`firmware/lib/epp_zone_engine/src/epp_zone_engine.cpp`:

```cpp
#include "epp_zone_engine.h"

namespace epp {
// Stub — will be implemented in Phase 2
}  // namespace epp
```

`firmware/lib/epp_zone_engine/src/epp_calibration.cpp`:

```cpp
#include "epp_calibration.h"

namespace epp {
// Stub — will be implemented in Phase 2
}  // namespace epp
```

- [ ] **Step 7: Create minimal test**

`firmware/lib/epp_zone_engine/tests/test_grid.cpp`:

```cpp
#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_types.h"

TEST_CASE("constants match expected values") {
    CHECK(epp::GRID_COLS == 20);
    CHECK(epp::GRID_ROWS == 20);
    CHECK(epp::GRID_CELL_COUNT == 400);
    CHECK(epp::GRID_CELL_SIZE_MM == 300);
    CHECK(epp::CELL_ROOM_BIT == 0x01);
    CHECK(epp::MAX_TARGETS == 3);
    CHECK(epp::MAX_ZONES == 7);
}
```

- [ ] **Step 8: Build and run the test locally**

```bash
cd firmware/lib/epp_zone_engine
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
cd build && ctest --output-on-failure
```

Expected: 1 test case passes.

- [ ] **Step 9: Clean build artifacts and commit**

```bash
rm -rf firmware/lib/epp_zone_engine/build
git add firmware/lib/epp_zone_engine/
git commit -m "Scaffold C++ zone engine library with build system and constants test"
```

---

### Task 4: Scaffold ESPHome external component

Create the minimal ESPHome external component structure. This is a no-op component that registers with ESPHome but does nothing — it exists so the variant YAMLs can reference it and still compile.

**Files:**
- Create: `firmware/components/epp/__init__.py`
- Create: `firmware/components/epp/epp_component.h`
- Create: `firmware/components/epp/epp_component.cpp`

- [ ] **Step 1: Create the ESPHome component Python file**

`firmware/components/epp/__init__.py`:

```python
"""EPP Zone Engine ESPHome external component (scaffold)."""

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.const import CONF_ID

CODEOWNERS = ["@clintongormley"]

epp_ns = cg.esphome_ns.namespace("epp")
EPPComponent = epp_ns.class_("EPPComponent", cg.Component)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(EPPComponent),
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
```

- [ ] **Step 2: Create the C++ header**

`firmware/components/epp/epp_component.h`:

```cpp
#pragma once

#include "esphome/core/component.h"

namespace epp {

class EPPComponent : public esphome::Component {
 public:
  void setup() override;
  void loop() override;
  float get_setup_priority() const override;
};

}  // namespace epp
```

- [ ] **Step 3: Create the C++ source**

`firmware/components/epp/epp_component.cpp`:

```cpp
#include "epp_component.h"
#include "esphome/core/log.h"

namespace epp {

static const char *const TAG = "epp";

void EPPComponent::setup() {
  ESP_LOGI(TAG, "EPP Zone Engine component initialized (scaffold)");
}

void EPPComponent::loop() {
  // Stub — will process LD2450 frames in Phase 3
}

float EPPComponent::get_setup_priority() const {
  return esphome::setup_priority::DATA;
}

}  // namespace epp
```

- [ ] **Step 4: Commit**

```bash
git add firmware/components/epp/
git commit -m "Scaffold ESPHome external component for zone engine"
```

---

### Task 5: Wire external component into variant YAMLs

Add the `external_components` reference and `epp` component block to the base YAML so all variants pick it up.

**Files:**
- Modify: `firmware/common/everything-presence-pro-base.yaml` (add external_components + epp block)

- [ ] **Step 1: Add external_components and epp block to base YAML**

Add the following at the top of `firmware/common/everything-presence-pro-base.yaml` (after the existing `esphome:` block, before `logger:`):

```yaml
external_components:
  - source:
      type: local
      path: ../components
    components: [epp]

epp:
```

ESPHome resolves `external_components` local paths relative to the main YAML file being compiled (the variant in `firmware/variants/`). The path `../components` resolves to `firmware/components/`, which is correct. Even though this block lives in an included package file, ESPHome merges it into the top-level config first, then resolves paths.

- [ ] **Step 2: Commit**

```bash
git add firmware/common/everything-presence-pro-base.yaml
git commit -m "Wire EPP external component into firmware base config"
```

---

### Task 6: Add gitignore entries

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add firmware build artifact patterns**

Append to `.gitignore`:

```
# ESPHome build artifacts
firmware/.esphome/
firmware/build/

# C++ build artifacts
firmware/lib/epp_zone_engine/build/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "Add firmware build artifacts to gitignore"
```

---

### Task 7: Add firmware compile CI workflow

**Files:**
- Create: `.github/workflows/firmware.yml`

- [ ] **Step 1: Create the workflow file**

`.github/workflows/firmware.yml`:

```yaml
name: Firmware

on:
  push:
    branches: [main]
    paths:
      - 'firmware/**'
      - '.github/workflows/firmware.yml'
  pull_request:
    paths:
      - 'firmware/**'
      - '.github/workflows/firmware.yml'

jobs:
  cpp-tests:
    runs-on: ubuntu-latest
    name: C++ Tests
    steps:
      - uses: actions/checkout@v4
      - name: Install CMake
        run: sudo apt-get update && sudo apt-get install -y cmake
      - name: Build and test
        run: |
          cd firmware/lib/epp_zone_engine
          cmake -B build -DCMAKE_BUILD_TYPE=Debug
          cmake --build build
          cd build && ctest --output-on-failure

  compile:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        variant:
          - wifi
          - wifi-ble
          - wifi-co2
          - wifi-ble-co2
          - ethernet
          - ethernet-ble
          - ethernet-co2
          - ethernet-ble-co2
    name: "Compile ${{ matrix.variant }}"
    steps:
      - uses: actions/checkout@v4
      - name: Install ESPHome
        run: pip install esphome
      - name: Compile firmware
        run: esphome compile firmware/variants/${{ matrix.variant }}.yaml
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/firmware.yml
git commit -m "Add CI workflow for firmware compile and C++ tests"
```

---

### Task 8: Local compile verification

Test that at least one variant compiles locally. This catches path issues before pushing to CI.

**Files:** None (verification only)

- [ ] **Step 1: Install ESPHome locally if not present**

```bash
pip install esphome
```

- [ ] **Step 2: Compile the wifi variant**

```bash
esphome compile firmware/variants/wifi.yaml
```

Expected: Successful compilation. This will take ~2 minutes on first run (downloads ESP-IDF toolchain).

If it fails due to `external_components` path resolution, fix the path in `firmware/common/everything-presence-pro-base.yaml` and commit the fix.

- [ ] **Step 3: Compile the ethernet-ble-co2 variant (most complex)**

```bash
esphome compile firmware/variants/ethernet-ble-co2.yaml
```

Expected: Successful compilation.

- [ ] **Step 4: Manual flash-and-boot verification (requires hardware)**

The spec deliverable is "builds and flashes unchanged." CI verifies compilation; this step verifies the device actually boots. Flash the wifi variant to a real EPP device via USB:

```bash
esphome upload firmware/variants/wifi.yaml
```

Verify: device boots, creates WiFi AP or connects to known network, sensors report to HA. This is a manual gate — if no hardware is available, note it and proceed. The compile-pass is the automated gate.

---

### Task 9: Update CI workflow to also run C++ tests in the main tests.yml

Add C++ tests to the existing tests workflow so they run alongside Python and frontend tests on all PRs (not just firmware-path-filtered ones).

**Files:**
- Modify: `.github/workflows/tests.yml`

- [ ] **Step 1: Add cpp job to tests.yml**

Add the following job to `.github/workflows/tests.yml` after the `frontend` job:

```yaml
  cpp:
    runs-on: ubuntu-latest
    name: C++ Tests
    steps:
      - uses: actions/checkout@v4
      - name: Install CMake
        run: sudo apt-get update && sudo apt-get install -y cmake
      - name: Build and test
        run: |
          cd firmware/lib/epp_zone_engine
          cmake -B build -DCMAKE_BUILD_TYPE=Debug
          cmake --build build
          cd build && ctest --output-on-failure
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/tests.yml
git commit -m "Add C++ zone engine tests to main CI workflow"
```

---

### Task 10: Final verification and summary commit

- [ ] **Step 1: Verify directory structure**

```bash
find firmware -type f | sort
```

Expected output should show:
- 6 files in `firmware/common/`
- 8 files in `firmware/variants/`
- 12+ files in `firmware/lib/epp_zone_engine/` (include, src, tests, CMakeLists)
- 3 files in `firmware/components/epp/`

- [ ] **Step 2: Run C++ tests one more time**

```bash
cd firmware/lib/epp_zone_engine && cmake -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build && cd build && ctest --output-on-failure
```

Expected: All tests pass.

- [ ] **Step 3: Run existing Python tests to verify nothing broke**

```bash
pytest tests/ -v
```

Expected: All existing tests still pass. The firmware directory should not affect Python tests.

- [ ] **Step 4: Run existing frontend tests to verify nothing broke**

```bash
cd frontend && npm run test
```

Expected: All existing tests still pass.

- [ ] **Step 5: Review the full diff**

```bash
git log --oneline origin/firmware..HEAD
```

Expected: ~8 commits covering the import, scaffold, CI, and verification steps.

---

### Task 11: Delete the fork repo

Once all verification passes and the firmware is confirmed working from the monorepo, the standalone fork is no longer needed.

**Files:** None (external repo deletion)

- [ ] **Step 1: Confirm all firmware files are in the monorepo**

```bash
diff <(ls /workspaces/ha-dev/everything-presence-pro/common/) <(ls firmware/common/)
```

Expected: Identical file lists.

- [ ] **Step 2: Delete the local clone**

```bash
rm -rf /workspaces/ha-dev/everything-presence-pro
```

- [ ] **Step 3: Delete the GitHub fork repo**

This is a manual step — go to https://github.com/clintongormley/everything-presence-pro/settings and delete the repository. Only do this after verifying compilation and (ideally) flash-and-boot from the monorepo.
