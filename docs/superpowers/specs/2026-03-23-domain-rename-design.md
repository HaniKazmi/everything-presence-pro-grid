# Domain Rename: everything_presence_pro → eppgrid

## Summary

Rename the integration domain from `everything_presence_pro` to `eppgrid` to use a short, consistent identifier. The display name remains "Everything Presence Pro Grid". This is a mechanical rename with no logic changes.

## Rename Map

| Category | From | To |
|----------|------|----|
| Domain constant | `everything_presence_pro` | `eppgrid` |
| Component directory | `custom_components/everything_presence_pro/` | `custom_components/eppgrid/` |
| Python class prefix | `EverythingPresencePro` | `EPPGrid` |
| WebSocket commands | `everything_presence_pro/…` | `eppgrid/…` |
| Panel element + files | `everything-presence-pro-panel` | `eppgrid-panel` |
| Integration display name | `Everything Presence Pro` | `Everything Presence Pro Grid` |
| Sidebar title | `EP Pro` | `Everything Presence Pro Grid` |
| Python imports | `custom_components.everything_presence_pro` | `custom_components.eppgrid` |

## Scope

### Python (custom_components/)

- `git mv` the directory
- Update `DOMAIN` in `const.py`
- Update `domain` and `name` in `manifest.json`
- Rename all classes: `EverythingPresencePro*` → `EPPGrid*`
- Relative imports (e.g. `from .const import DOMAIN`) stay as-is
- Update all 9 WebSocket command type strings
- Update `strings.json` and `translations/en.json` product name references
- Update hardcoded JS filename references in `__init__.py` (lines 52, 61)
- Verify `config_flow.py` class decorator `domain=DOMAIN` picks up the new constant

### Tests (tests/)

- Update all `from custom_components.everything_presence_pro` imports
- Update all class name references
- Update WebSocket command strings in test assertions
- Update any mock paths

### Frontend (frontend/)

- Rename `everything-presence-pro-panel.ts` → `eppgrid-panel.ts`
- Update `frontend/src/index.ts` export path and class name
- Update custom element registration tag and `HTMLElementTagNameMap`
- Update WebSocket message type strings
- Update `rollup.config.js` input/output paths
- Update `package.json` name field
- Delete old built JS artifact, rebuild with new filename `eppgrid-panel.js`

### Frontend Tests (frontend/src/__tests__/)

- Update element tag references
- Update import paths
- Update WebSocket command strings
- Update integration URL paths

### Tools

- Update `tools/sensor-diagnostic.html`: domain filter, WS commands, UI text

### Config & Build

- `pyproject.toml`: update known-first-party and coverage source paths
- `.github/workflows/tests.yml`: update pytest coverage path
- `hacs.json`: no change needed (HACS infers domain from directory name)
- `README.md`: update component directory path and product name

### Symlink

```bash
rm homeassistant-core/config/custom_components/everything_presence_pro
ln -s /workspaces/ha-dev/everything-presence-pro-grid/custom_components/eppgrid \
      homeassistant-core/config/custom_components/eppgrid
```

### Documentation

- Update domain references in all `docs/**/*.md` files

### Workspace Memory

- Update MEMORY.md component mapping: `everything-presence-pro-grid` → `eppgrid`

## Out of Scope

- No logic changes
- No new features
- No HA core changes beyond the symlink
- No config entry migration — this is a breaking change

## Verification

1. `grep -rP "everything_presence_pro" . --include="*.py" --include="*.ts" --include="*.json" --include="*.html" --include="*.toml" --include="*.yml" | grep -v node_modules | grep -v ".git/"` returns no hits
2. `grep -r "EverythingPresencePro" . --include="*.py" --include="*.ts" | grep -v node_modules | grep -v ".git/"` returns no hits
3. `grep -r "everything-presence-pro-panel" . --include="*.py" --include="*.ts" --include="*.js" --include="*.json" --include="*.html" | grep -v node_modules | grep -v ".git/"` returns no hits
4. All Python tests pass
5. All frontend tests pass
6. Frontend JS builds successfully
7. `ruff check` and `ruff format` pass

## Risks

- **Breaking change for existing installs**: Users with `everything_presence_pro` config entries will need to remove and re-add. No migration path provided.
- **Built JS artifact**: Must be rebuilt after TS rename, not just copied.
- **Dispatcher signals**: Change automatically via `DOMAIN` constant.
