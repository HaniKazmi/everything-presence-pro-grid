# Sidebar Panel Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toggling the sidebar panel option immediately registers/unregisters the sidebar entry without HA restart. Static path stays registered always (needed for future dashboard strategy).

**Architecture:** Split `_register_panel()` into `_register_static_path()` and `_register_sidebar()`, add `_unregister_sidebar()` using `frontend.async_remove_panel()`, and wire up a config entry update listener to react to options changes.

**Tech Stack:** Python (backend), pytest (tests)

**Spec:** `docs/superpowers/specs/2026-04-02-sidebar-panel-toggle-design.md`

---

## File Map

| Layer | File | Action | Purpose |
|-------|------|--------|---------|
| Backend | `custom_components/eppgrid/__init__.py` | Modify | Split panel registration, add update listener, add unregister |
| Backend test | `tests/test_init.py` | Modify | Tests for static path, sidebar toggle, update listener, unload |

---

### Task 1: Write failing tests for the new panel functions

**Files:**
- Modify: `tests/test_init.py`

- [ ] **Step 1: Write test `test_setup_always_registers_static_path`**

  Verify that `_register_static_path` is called during setup regardless of `sidebar_panel` value. Test both True and False cases. Patch `_register_static_path` and `_register_sidebar` as AsyncMocks.

- [ ] **Step 2: Write test `test_setup_registers_sidebar_when_enabled`**

  Verify `_register_sidebar` is called when `store.sidebar_panel` is True.

- [ ] **Step 3: Write test `test_setup_skips_sidebar_when_disabled`**

  Verify `_register_sidebar` is NOT called when `store.sidebar_panel` is False. Patch `EPPGridStore` to return `sidebar_panel = False`.

- [ ] **Step 4: Write test `test_setup_registers_update_listener`**

  Verify that `async_setup_entry` calls `entry.async_on_unload(entry.add_update_listener(...))`. Use the `config_entry` fixture and assert the listener was registered.

- [ ] **Step 5: Write test `test_options_updated_registers_sidebar`**

  Import `_async_options_updated` from `__init__.py`. Set up a mock manager with `_store.sidebar_panel = True`. Call the function and verify `_register_sidebar` was called.

- [ ] **Step 6: Write test `test_options_updated_unregisters_sidebar`**

  Same as above but with `sidebar_panel = False`. Verify `_unregister_sidebar` was called.

- [ ] **Step 7: Write test `test_unregister_sidebar_calls_frontend_remove`**

  Import `_unregister_sidebar`. Call it and verify it calls `frontend.async_remove_panel(hass, DOMAIN, warn_if_unknown=False)`.

- [ ] **Step 8: Write test `test_unload_removes_panel`**

  Set up the integration, then call `async_unload_entry`. Verify `_unregister_sidebar` was called.

- [ ] **Step 9: Run tests, confirm all new tests FAIL**

  ```bash
  cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_init.py -x -v 2>&1 | tail -30
  ```

---

### Task 2: Implement the panel split and update listener

**Files:**
- Modify: `custom_components/eppgrid/__init__.py`

- [ ] **Step 1: Add `frontend` import**

  Add `from homeassistant.components import frontend` alongside the existing `panel_custom` import.

- [ ] **Step 2: Extract `_register_static_path(hass)`**

  Move the `StaticPathConfig` registration from `_register_panel` into a new `async def _register_static_path(hass)` function.

- [ ] **Step 3: Extract `_register_sidebar(hass)`**

  Move the `panel_custom.async_register_panel()` call into a new `async def _register_sidebar(hass)` function. Keep the hash computation here.

- [ ] **Step 4: Add `_unregister_sidebar(hass)`**

  New sync function:
  ```python
  @callback
  def _unregister_sidebar(hass: HomeAssistant) -> None:
      frontend.async_remove_panel(hass, DOMAIN, warn_if_unknown=False)
  ```
  Import `callback` from `homeassistant.core`.

- [ ] **Step 5: Update `async_setup_entry`**

  - Always call `await _register_static_path(hass)`
  - Conditionally call `await _register_sidebar(hass)` only when `store.sidebar_panel` is True
  - Register update listener: `entry.async_on_unload(entry.add_update_listener(_async_options_updated))`

- [ ] **Step 6: Add `_async_options_updated` callback**

  ```python
  async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
      manager = hass.data.get(DOMAIN)
      if manager is None:
          return
      if manager._store.sidebar_panel:
          await _register_sidebar(hass)
      else:
          _unregister_sidebar(hass)
  ```

- [ ] **Step 7: Update `async_unload_entry`**

  Add `_unregister_sidebar(hass)` before returning.

- [ ] **Step 8: Remove old `_register_panel` function**

  Delete the old combined function entirely. It is fully replaced by `_register_static_path` + `_register_sidebar`.

- [ ] **Step 9: Run tests, confirm all tests PASS**

  ```bash
  cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/test_init.py -x -v 2>&1 | tail -30
  ```

---

### Task 3: Update existing tests that reference `_register_panel`

**Files:**
- Modify: `tests/test_init.py`

- [ ] **Step 1: Update old tests**

  The existing tests (`test_setup_entry_registers_panel_when_enabled`, `test_setup_entry_skips_panel_when_disabled`, `test_register_panel`, `test_register_panel_hash_oserror`) reference `_register_panel`. Update them to use the new function names (`_register_static_path`, `_register_sidebar`) or remove tests that are now redundant (replaced by Task 1 tests).

- [ ] **Step 2: Run full test suite**

  ```bash
  cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m pytest tests/ -x -v 2>&1 | tail -40
  ```

- [ ] **Step 3: Run ruff lint**

  ```bash
  cd /Users/clintongormley/workspace/worktrees/epp-flasher && python -m ruff check custom_components/eppgrid/__init__.py tests/test_init.py
  ```
