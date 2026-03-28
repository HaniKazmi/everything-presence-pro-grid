# C++ Coverage Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add gcov+lcov coverage measurement to the C++ zone engine library and enforce 90% line coverage in both the pre-push hook and CI.

**Architecture:** Add `--coverage` flags via a CMake `Coverage` build type. Use `lcov --extract '*/src/*.cpp'` to isolate library coverage. Enforce threshold by parsing `lcov --summary` output. The pre-push hook gracefully degrades if lcov is missing (warns but still runs tests). CI installs lcov and fails the job if coverage is below 90%.

**Tech Stack:** CMake, gcov (via `--coverage` flag), lcov, bash

---

### Task 1: Add Coverage build type to CMakeLists.txt

**Files:**
- Modify: `firmware/lib/epp_zone_engine/CMakeLists.txt:5-6`

- [ ] **Step 1: Add coverage flags after the C++ standard settings**

In `firmware/lib/epp_zone_engine/CMakeLists.txt`, add the coverage compile/link
options right after `set(CMAKE_CXX_STANDARD_REQUIRED ON)`:

```cmake
if(CMAKE_BUILD_TYPE STREQUAL "Coverage")
    add_compile_options(--coverage)
    add_link_options(--coverage)
endif()
```

- [ ] **Step 2: Verify the coverage build works**

Run:
```bash
cd firmware/lib/epp_zone_engine
cmake -B build-coverage -DCMAKE_BUILD_TYPE=Coverage -DCMAKE_POLICY_VERSION_MINIMUM=3.5
cmake --build build-coverage
cd build-coverage && ctest --output-on-failure
```
Expected: All 75 tests pass. `.gcno` files are generated in the build directory.

Verify gcno files exist:
```bash
find build-coverage -name '*.gcno' | head -5
```
Expected: Several `.gcno` files listed.

- [ ] **Step 3: Verify lcov can capture and extract coverage**

Run:
```bash
cd firmware/lib/epp_zone_engine
lcov --capture --directory build-coverage --output-file build-coverage/coverage.info \
    --ignore-errors inconsistent,format
lcov --extract build-coverage/coverage.info '*/src/*.cpp' \
    --output-file build-coverage/coverage-filtered.info \
    --ignore-errors unused
lcov --summary build-coverage/coverage-filtered.info
```
Expected: Summary shows ~97% line coverage across 5 source files.

- [ ] **Step 4: Clean up and commit**

```bash
rm -rf firmware/lib/epp_zone_engine/build-coverage
git add firmware/lib/epp_zone_engine/CMakeLists.txt
git commit -m "build: add CMake Coverage build type for gcov instrumentation"
```

---

### Task 2: Add build-coverage/ to .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add the coverage build directory**

In the root `.gitignore`, add `firmware/lib/epp_zone_engine/build-coverage/`
under the existing `firmware/lib/epp_zone_engine/build/` entry:

```
firmware/lib/epp_zone_engine/build-coverage/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add C++ coverage build directory to .gitignore"
```

---

### Task 3: Add C++ section to pre-push hook

**Files:**
- Modify: `.git/hooks/pre-push` (in main repo: the worktree shares it)

The pre-push hook lives at the main repo's `.git/hooks/pre-push` (worktrees
share hooks). The actual path is:
`/Users/clintongormley/workspace/repos/everything-presence-pro-grid/.git/hooks/pre-push`

- [ ] **Step 1: Add the C++ tests + coverage section**

Insert the following block between the Python and TypeScript sections (after
the `# -- Python --` block ends, before `# -- TypeScript --`). Place it as a
new `# -- C++ --` section:

```bash
# -- C++ --

CPP_LIB="$ROOT/firmware/lib/epp_zone_engine"
CPP_BUILD="$CPP_LIB/build-coverage"

step "C++ build (coverage)"
if cmake -B "$CPP_BUILD" -S "$CPP_LIB" -DCMAKE_BUILD_TYPE=Coverage -DCMAKE_POLICY_VERSION_MINIMUM=3.5 2>&1 \
    && cmake --build "$CPP_BUILD" 2>&1; then
    pass "C++ build"
else
    fail "C++ build"
fi

step "C++ tests"
if [ "$failed" -eq 0 ] && (cd "$CPP_BUILD" && ctest --output-on-failure) 2>&1; then
    pass "C++ tests"
else
    fail "C++ tests"
fi

step "C++ coverage"
if [ "$failed" -eq 0 ] && command -v lcov >/dev/null 2>&1; then
    lcov --capture --directory "$CPP_BUILD" --output-file "$CPP_BUILD/coverage.info" \
        --ignore-errors inconsistent,format 2>&1
    lcov --extract "$CPP_BUILD/coverage.info" '*/src/*.cpp' \
        --output-file "$CPP_BUILD/coverage-filtered.info" \
        --ignore-errors unused 2>&1
    cpp_cov=$(lcov --summary "$CPP_BUILD/coverage-filtered.info" 2>&1 \
        | grep 'lines\.\.\.\.\.\.\.' | sed 's/.*: *\([0-9]*\.[0-9]*\)%.*/\1/')
    printf '  C++ line coverage: %s%%\n' "$cpp_cov"
    if [ "$(echo "$cpp_cov < 90" | bc)" -eq 1 ]; then
        fail "C++ coverage ${cpp_cov}% < 90%"
    else
        pass "C++ coverage ${cpp_cov}%"
    fi
elif ! command -v lcov >/dev/null 2>&1; then
    printf '  \033[1;33m⚠  lcov not installed — skipping coverage check (brew install lcov)\033[0m\n'
fi

rm -rf "$CPP_BUILD"
```

- [ ] **Step 2: Verify the hook runs end-to-end**

Do a dry run of just the C++ section by sourcing the relevant parts, or test
by attempting a push to a test branch. The expected output is:

```
▶ C++ build (coverage)
✓ C++ build
▶ C++ tests
✓ C++ tests
▶ C++ coverage
  C++ line coverage: 97.9%
✓ C++ coverage 97.9%
```

- [ ] **Step 3: Note — no commit needed**

The pre-push hook is in `.git/hooks/` which is not version-controlled.
No git commit required for this task.

---

### Task 4: Add C++ coverage to CI workflow

**Files:**
- Modify: `.github/workflows/tests.yml:66-79`

- [ ] **Step 1: Update the cpp job to build with coverage and enforce threshold**

Replace the existing `cpp` job in `.github/workflows/tests.yml` with:

```yaml
  cpp:
    runs-on: ubuntu-latest
    name: C++ Tests
    steps:
      - uses: actions/checkout@v4
      - name: Install CMake and lcov
        run: sudo apt-get update && sudo apt-get install -y cmake lcov
      - name: Build with coverage
        working-directory: firmware/lib/epp_zone_engine
        run: |
          cmake -B build -DCMAKE_BUILD_TYPE=Coverage
          cmake --build build
      - name: Run tests
        working-directory: firmware/lib/epp_zone_engine/build
        run: ctest --output-on-failure
      - name: Check coverage
        working-directory: firmware/lib/epp_zone_engine
        run: |
          lcov --capture --directory build --output-file build/coverage.info \
              --ignore-errors inconsistent,format
          lcov --extract build/coverage.info '*/src/*.cpp' \
              --output-file build/coverage-filtered.info \
              --ignore-errors unused
          lcov --summary build/coverage-filtered.info
          COV=$(lcov --summary build/coverage-filtered.info 2>&1 \
              | grep 'lines\.\.\.\.\.\.\.' | sed 's/.*: *\([0-9]*\.[0-9]*\)%.*/\1/')
          echo "C++ line coverage: ${COV}%"
          if [ "$(echo "$COV < 90" | bc)" -eq 1 ]; then
            echo "::error::C++ coverage ${COV}% is below 90% threshold"
            exit 1
          fi
      - name: Generate HTML report
        if: always()
        working-directory: firmware/lib/epp_zone_engine
        run: |
          genhtml build/coverage-filtered.info --output-directory build/coverage-html \
              --ignore-errors inconsistent
      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: cpp-coverage-report
          path: firmware/lib/epp_zone_engine/build/coverage-html/
```

- [ ] **Step 2: Verify YAML is valid**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/tests.yml'))" && echo "valid"
```
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/tests.yml
git commit -m "ci: add C++ coverage enforcement at 90% threshold"
```

---

### Task 5: Verify everything works end-to-end

- [ ] **Step 1: Run the full C++ coverage flow locally**

```bash
cd firmware/lib/epp_zone_engine
cmake -B build-coverage -DCMAKE_BUILD_TYPE=Coverage -DCMAKE_POLICY_VERSION_MINIMUM=3.5
cmake --build build-coverage
cd build-coverage && ctest --output-on-failure && cd ..
lcov --capture --directory build-coverage --output-file build-coverage/coverage.info \
    --ignore-errors inconsistent,format
lcov --extract build-coverage/coverage.info '*/src/*.cpp' \
    --output-file build-coverage/coverage-filtered.info \
    --ignore-errors unused
lcov --summary build-coverage/coverage-filtered.info
```
Expected: 5 source files, ~97% line coverage, 100% function coverage.

- [ ] **Step 2: Clean up**

```bash
rm -rf firmware/lib/epp_zone_engine/build-coverage
```

- [ ] **Step 3: Verify CI YAML parses correctly**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/tests.yml'))" && echo "valid"
```
Expected: `valid`
