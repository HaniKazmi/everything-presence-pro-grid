# Installation

Everything Presence Pro Grid is distributed through HACS. You'll need a working Home Assistant install to add it to.

## Prerequisites

- Home Assistant 2025.2.0 or newer.
- [HACS](https://hacs.xyz/) installed (recommended).

## Install via HACS (recommended)

HACS installs the integration from source and handles updates in one click. Use this path unless you can't run HACS.

1. Open **HACS** in the Home Assistant sidebar.
2. Search for **Everything Presence Pro Grid** and click **Download**.
3. Restart Home Assistant.

![Installing Everything Presence Pro Grid with HACS.](../images/installation/hacs.png "Installing Everything Presence Pro Grid with HACS.")

## Install manually

If you can't use HACS:

1. Download the latest release archive from the [Releases page](https://github.com/clintongormley/everything-presence-pro-grid/releases).
2. Unpack it and copy `custom_components/eppgrid/` into your HA config's `custom_components/` folder.
3. Restart Home Assistant.

## After installing

1. Go to **Settings → Devices & services → Add integration**, search for **Everything Presence Pro Grid**, and add the entry.
2. The **Everything Presence Pro Grid** panel appears in the HA sidebar for administrator users only — Home Assistant hides it from non-admin users. If the panel doesn't show up for you and you are an admin, hard-refresh the HA web UI (Ctrl-F5 / Cmd-Shift-R). Non-admin users can still see EPP Grid entities (zone presence, target positions, environment sensors) on any shared dashboard via the standard Home Assistant entity cards.
3. The panel starts empty. See [Flashing firmware](flashing-firmware.md) to put Everything Presence Pro Grid firmware on your first device.

![Everything Presence Pro Grid panel in the HA sidebar, empty state — no devices yet.](../images/installation/empty-panel.png)

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| HACS doesn't list the integration | HACS hasn't refreshed its catalogue yet | In HACS, click the three-dot menu and choose **Reload**. If that doesn't help, restart Home Assistant and open HACS again. |
| Integration installed but the panel doesn't appear in the HA sidebar | Integration entry hasn't been added yet, or you're signed in as a non-admin user | Confirm you're signed in as an administrator (the panel is admin-only). Otherwise go to **Settings → Devices & services → Add integration** and add **Everything Presence Pro Grid**. If the panel still doesn't appear, hard-refresh the HA web UI (**Ctrl-F5** / **Cmd-Shift-R**). |
| "Integration update required" banner appears immediately after install | Your device firmware is newer than the integration release you've just installed | Either update the integration to a newer release in HACS, or downgrade the firmware to match. |
| Manual install done but panel still not appearing | `custom_components/eppgrid/` is in the wrong place, or nested one level too deep | Verify the `eppgrid/` directory sits directly under your HA config's `custom_components/` folder, and check HA logs for import errors. |

Still stuck? See [Troubleshooting](troubleshooting.md) for how to open an issue.

## Where to next

- **[Flashing firmware →](flashing-firmware.md)** — put Everything Presence Pro Grid firmware onto your device.
