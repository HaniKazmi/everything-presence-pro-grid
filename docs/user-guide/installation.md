# Installation

This page walks through installing the Everything Presence Pro Grid integration into Home Assistant. It assumes you already have Home Assistant running — the integration itself is a HACS custom integration that plugs into your existing HA setup.

## Prerequisites

- **Home Assistant 2025.2.0 or newer.**
- **An Everything Presence Pro device** with the LD2450 radar, the SEN0609 static-presence sensor, and the standard environmental sensors (illuminance, temperature, humidity, CO2). Either hardware variant — Wi-Fi or Ethernet — works.
- **Everything Presence Pro Grid firmware running on the device.** If your device shipped with the original firmware, flash Everything Presence Pro Grid first — see [Firmware](firmware.md) for the walkthrough. If you just pulled the device out of the box and have never flashed it, do that before anything else.

## Install via HACS (recommended)

HACS is the recommended route. It installs the integration from source, tracks updates, and handles upgrades in one click. This is the path you want unless you can't run HACS for some reason.

1. Open **HACS** in the Home Assistant sidebar.
2. Click the three-dot menu in the top right and choose **Custom repositories**.
3. Paste `https://github.com/clintongormley/everything-presence-pro-grid` into the repository field, pick **Integration** as the type, and click **Add**.
4. Close the dialog. Search for **Everything Presence Pro Grid** in HACS and click **Download**.
5. Restart Home Assistant.

!!! note
    The integration isn't in HACS's default catalogue, which is why the custom-repository step is needed. Once added, future updates show up in HACS like any other integration.

!!! example "Screenshot placeholder"
    **HACS Custom repositories dialog with the Everything Presence Pro Grid repo URL filled in.** `installation/hacs-custom-repo.png`

## Install manually (last resort)

Only use this route if HACS isn't an option — a container without HACS, a policy reason, a broken HACS install. Manual installs don't auto-update; you'll need to repeat the download/copy dance for every new release.

1. Go to the [Releases page](https://github.com/clintongormley/everything-presence-pro-grid/releases) and download the latest release archive.
2. Unpack it. Inside you'll find `custom_components/eppgrid/`.
3. Copy the `eppgrid/` directory into your HA config's `custom_components/` folder (create it if it doesn't exist).
4. Restart Home Assistant.

!!! warning
    Don't mix install methods. If you've used HACS, don't overwrite with a manual copy — HACS will then refuse to update and the install can end up in a broken half-state.

## After installing

- The **Everything Presence Pro Grid panel** appears in the HA sidebar. You may need a hard refresh of the HA web UI (Ctrl-F5 / Cmd-Shift-R) before it shows up.
- No devices are configured yet — the panel will be empty on first open.
- If you already have an Everything Presence Pro device connected to HA via the [ESPHome integration](https://www.home-assistant.io/integrations/esphome/), Everything Presence Pro Grid will discover it automatically and list it in the panel. See [Pairing](getting-started/pairing.md) for how that works and how to add a device if it isn't there yet.

!!! example "Screenshot placeholder"
    **Everything Presence Pro Grid panel in the HA sidebar, empty state — no devices yet.** `installation/empty-panel.png`

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| HACS doesn't list the integration after adding the custom repo | HACS hasn't rescanned its catalogue yet | Restart Home Assistant, then open HACS again. The integration shows up under **Integrations**. |
| Integration installed but the panel doesn't appear in the HA sidebar | Browser has a cached version of the HA UI | Hard refresh the HA web UI (**Ctrl-F5** / **Cmd-Shift-R**). If still missing, restart Home Assistant. |
| "Integration update required" banner appears immediately after install | Your device firmware is newer than the integration release you've just installed | Either update the integration to a newer release in HACS, or downgrade the firmware to match. |
| Manual install done but panel still not appearing | `custom_components/eppgrid/` is in the wrong place, or nested one level too deep | Verify the `eppgrid/` directory sits directly under your HA config's `custom_components/` folder (not inside a subdir), and check HA logs for import errors. |

See also: the [central Troubleshooting](troubleshooting.md) page for conceptual FAQ and how to open a GitHub issue.

## Where to next

- **[Pairing →](getting-started/pairing.md)** — add your device to Home Assistant so Everything Presence Pro Grid can pick it up.
