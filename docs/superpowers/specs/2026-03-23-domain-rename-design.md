# Domain Rename: everything_presence_pro → everything_presence_pro_grid

## Summary

Rename the integration domain from `everything_presence_pro` to `everything_presence_pro_grid` to match the repo name. This is a mechanical rename with no logic changes.

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
- Update all intra-package imports (relative imports stay as-is since they use `.`)
- Update WebSocket command type strings

### Tests (tests/)

- Update all `from custom_components.everything_presence_pro` imports
- Update all class name references
- Update WebSocket command strings in test assertions
- Update any mock paths

### Frontend (frontend/)

- Rename `everything-presence-pro-panel.ts` → `everything-presence-pro-grid-panel.ts`
- Update custom element registration tag
- Update WebSocket message type strings
- Update rollup.config.js input/output paths
- Rebuild JS bundle into new component directory

### Frontend Tests (frontend/src/__tests__/)

- Update element tag references
- Update WebSocket command strings
- Update integration URL paths (`/config/integrations/integration/everything_presence_pro_grid`)

### Config & Build

- `pyproject.toml`: update known-first-party and coverage source paths
- `.github/workflows/tests.yml`: update pytest coverage path
- `hacs.json`: no domain field, likely no change needed
- Symlink in `homeassistant-core/config/custom_components/`: remove old, create new pointing to renamed directory

### Documentation

- Update domain references in all docs/*.md files (architecture, data catalog, plans, specs)

## Out of Scope

- No logic changes
- No new features
- No HA core changes beyond the symlink

## Verification

- All Python tests pass
- All frontend tests pass
- Frontend JS builds successfully
- `ruff check` and `ruff format` pass
- Integration loads in HA (manual check via symlink)

## Risks

- **Existing HA installations**: Users with `everything_presence_pro` in their config will need to remove and re-add the integration. This is expected for a domain rename.
- **HACS**: The HACS manifest may need updating if it references the old domain.
