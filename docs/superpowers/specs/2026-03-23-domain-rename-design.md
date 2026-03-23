# Domain Rename: everything_presence_pro → everything_presence_pro_grid

## Summary

Rename the integration domain from `everything_presence_pro` to `everything_presence_pro_grid` to match the repo name. This is a mechanical rename with no logic changes.

The class prefix shortens from `EverythingPresencePro` to `EPPGrid` for line-length ergonomics. The abbreviation is a conscious trade-off — it's less self-documenting but significantly more readable in entity classes with long suffixes.

## Rename Map

| Category | From | To |
|----------|------|----|
| Domain constant | `everything_presence_pro` | `everything_presence_pro_grid` |
| Component directory | `custom_components/everything_presence_pro/` | `custom_components/everything_presence_pro_grid/` |
| Python class prefix | `EverythingPresencePro` | `EPPGrid` |
| WebSocket commands | `everything_presence_pro/…` | `everything_presence_pro_grid/…` |
| Panel element + files | `everything-presence-pro-panel` | `everything-presence-pro-grid-panel` |
| Sidebar title | `EP Pro` | `Everything Presence Pro Grid` |
| Python imports | `custom_components.everything_presence_pro` | `custom_components.everything_presence_pro_grid` |
| Frontend imports | same pattern | same pattern |

## Scope

### Python (custom_components/)

- `git mv` the directory
- Update `DOMAIN` in `const.py`
- Update `domain` in `manifest.json`
- Rename all classes: `EverythingPresencePro*` → `EPPGrid*`
- Relative imports (e.g. `from .const import DOMAIN`) stay as-is — no changes needed
- Update all 9 WebSocket command type strings: `list_entries`, `get_config`, `set_zones`, `set_room_layout`, `set_setup`, `subscribe_raw_targets`, `subscribe_grid_targets`, `rename_zone_entities`, `set_reporting`
- Update `strings.json` and `translations/en.json` product name references (e.g. "Everything Presence Pro" → "Everything Presence Pro Grid")
- Verify `config_flow.py` class decorator `domain=DOMAIN` picks up the new constant

### Tests (tests/)

- Update all `from custom_components.everything_presence_pro` imports
- Update all class name references
- Update WebSocket command strings in test assertions
- Update any mock paths

### Frontend (frontend/)

- Rename `everything-presence-pro-panel.ts` → `everything-presence-pro-grid-panel.ts`
- Update `frontend/src/index.ts` export path and class name
- Update custom element registration tag
- Update `HTMLElementTagNameMap` type declaration key
- Update WebSocket message type strings
- Update `rollup.config.js` input/output paths
- Update `package.json` name field to `everything-presence-pro-grid-frontend`
- Delete old built JS artifact, rebuild into new component directory with new filename `everything-presence-pro-grid-panel.js`

### Frontend Tests (frontend/src/__tests__/)

- Update element tag references
- Update WebSocket command strings
- Update integration URL paths (`/config/integrations/integration/everything_presence_pro_grid`)

### Tools

- Update `tools/sensor-diagnostic.html`: domain filter string, WebSocket command types, UI text references

### Config & Build

- `pyproject.toml`: update known-first-party and coverage source paths
- `.github/workflows/tests.yml`: update pytest coverage path
- `hacs.json`: no domain field — HACS infers domain from directory name, no change needed
- `README.md`: update component directory path and product name references

### Symlink

Remove old symlink and create new one with updated name and target:
```bash
rm homeassistant-core/config/custom_components/everything_presence_pro
ln -s /workspaces/ha-dev/everything-presence-pro-grid/custom_components/everything_presence_pro_grid \
      homeassistant-core/config/custom_components/everything_presence_pro_grid
```

### Documentation

- Update domain references in all `docs/*.md` files (architecture, data catalog, plans, specs)

### Workspace Memory

- Update MEMORY.md component mapping: `everything-presence-pro-grid` → `everything_presence_pro_grid`

## Out of Scope

- No logic changes
- No new features
- No HA core changes beyond the symlink
- No config entry migration — this is a breaking change (see Risks)

## Verification

1. `grep -r "everything_presence_pro[^_g]" --include="*.py" --include="*.ts" --include="*.json" --include="*.html" .` returns no hits (catches old domain without `_grid` suffix)
2. `grep -r "EverythingPresencePro" --include="*.py" --include="*.ts" .` returns no hits
3. All Python tests pass
4. All frontend tests pass
5. Frontend JS builds successfully
6. `ruff check` and `ruff format` pass

## Risks

- **Breaking change for existing installs**: Users with `everything_presence_pro` config entries will need to remove and re-add the integration. HA stores config entries in `.storage/core.config_entries` keyed by domain — old entries will be orphaned. Entity IDs and automations referencing the old domain will break. No migration path is provided; this is intentional for a pre-1.0 custom component.
- **Built JS artifact**: The committed `everything-presence-pro-panel.js` contains baked-in domain strings. Must be rebuilt after the TS rename, not just copied. If forgotten, panel registration will fail.
- **Dispatcher signals**: Signal strings like `everything_presence_pro_zones_updated_{entry_id}` change automatically via the `DOMAIN` constant. No external code should depend on these, but worth noting.
