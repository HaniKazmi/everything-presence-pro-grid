# Sidebar Panel Toggle Design

## Goal

Toggling the "Show sidebar panel" option in the integration's options flow should immediately add or remove the sidebar entry, without requiring a Home Assistant restart. The static path for the frontend JS must always be registered (even when the sidebar entry is hidden) because the panel URL will be used by a future dashboard strategy.

## Current State

- `async_setup_entry()` in `__init__.py` checks `store.sidebar_panel` and calls `_register_panel(hass)` if True. `_register_panel()` registers both the static path and the sidebar panel entry in one call.
- `EPPGridOptionsFlow.async_step_init()` in `config_flow.py` saves the new `sidebar_panel` value to the store but does not trigger any panel registration/unregistration. Changes only take effect on HA restart.
- There is no code to unregister the panel.

## Design

### Split `_register_panel()` into two concerns

1. **`_register_static_path(hass)`** -- Registers the `/{DOMAIN}_static` static path. Called unconditionally in `async_setup_entry()`. Idempotent (HA deduplicates static path registrations).

2. **`_register_sidebar(hass)`** -- Calls `panel_custom.async_register_panel()` with `sidebar_title`, `sidebar_icon`, and `module_url`. Only called when `sidebar_panel` is True.

3. **`_unregister_sidebar(hass)`** -- Calls `frontend.async_remove_panel(hass, DOMAIN, warn_if_unknown=False)` to remove the sidebar entry. Called when `sidebar_panel` is False.

### React to options changes via `update_listener`

In `async_setup_entry()`, register an update listener on the config entry:

```python
entry.async_on_unload(entry.add_update_listener(_async_options_updated))
```

The listener callback:

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

This fires after the options flow calls `async_create_entry()`, which triggers the config entry's update listeners.

### Options flow triggers the listener

The options flow already calls `self.async_create_entry(title="", data=user_input)`. When the options flow completes, HA fires the config entry update listeners. The `_async_options_updated` callback reads the current `sidebar_panel` value from the store (which the options flow already saved) and registers/unregisters accordingly.

No changes needed in `config_flow.py` beyond what already exists.

### `async_unload_entry()` cleanup

Add `_unregister_sidebar(hass)` to `async_unload_entry()` so the panel is removed when the integration is unloaded.

### Import

```python
from homeassistant.components import frontend
```

Use `frontend.async_remove_panel(hass, DOMAIN, warn_if_unknown=False)` for removal. The `warn_if_unknown=False` flag prevents log warnings if the panel was never registered (e.g., sidebar was never enabled).

## Testing

### `tests/test_init.py`

1. **`test_setup_always_registers_static_path`** -- Verify `_register_static_path` is always called, regardless of `sidebar_panel` value.

2. **`test_setup_registers_sidebar_when_enabled`** -- Verify `_register_sidebar` is called when `sidebar_panel` is True.

3. **`test_setup_skips_sidebar_when_disabled`** -- Verify `_register_sidebar` is NOT called when `sidebar_panel` is False.

4. **`test_setup_registers_update_listener`** -- Verify `entry.add_update_listener` is called during setup.

5. **`test_options_updated_registers_sidebar`** -- Call `_async_options_updated` with `sidebar_panel=True`, verify `_register_sidebar` is called.

6. **`test_options_updated_unregisters_sidebar`** -- Call `_async_options_updated` with `sidebar_panel=False`, verify `_unregister_sidebar` is called.

7. **`test_unregister_sidebar_calls_frontend_remove`** -- Verify `_unregister_sidebar` calls `frontend.async_remove_panel`.

8. **`test_unload_removes_panel`** -- Verify `async_unload_entry` calls `_unregister_sidebar`.

### `tests/test_config_flow.py`

No new tests needed. The options flow already has tests for saving the setting. The dynamic toggle is handled by the update listener in `__init__.py`, not by the options flow itself.
