# Troubleshooting

Each feature page in this user guide ends with a Troubleshooting table that covers the symptoms specific to that area. If you've worked through the relevant one and the problem isn't there, the next step is to open a GitHub issue.

## Collect diagnostics

1. In Home Assistant, go to **Settings → Devices & services**.
2. Find **Everything Presence Pro Grid** in the integration list.
3. Click the three-dot menu on the integration card → **Download diagnostics**.
4. Save the JSON file and attach it to the issue.

If the bug is something the integration itself logs about (errors in HA system logs, the panel showing a connection error, an automation behaving wrong), also turn on debug logging *before* reproducing the issue:

- **In the panel**, raise the relevant firmware component to **Debug** under [Settings → Logging](settings/logging.md).
- **In Home Assistant**, enable integration logging at **Settings → Devices & services → Everything Presence Pro Grid → ⋮ → Enable debug logging**.
- Reproduce the bug.
- Click **Disable debug logging** on the integration page. Home Assistant writes the captured logs to a downloadable file — attach it to the issue alongside the diagnostics JSON.

For the full walkthrough, see [Settings → Logging → Reading the logs](settings/logging.md#reading-the-logs).

## Open the issue

Open the issue at [github.com/clintongormley/everything-presence-pro-grid/issues](https://github.com/clintongormley/everything-presence-pro-grid/issues).

Include the following in the issue description:

- **Home Assistant version** (e.g. 2026.4.2).
- **Everything Presence Pro Grid integration version** (from HACS, or the `manifest.json`).
- **Device firmware version** (from the device's **Firmware Version** sensor).
- **Steps to reproduce** — numbered, starting from a known state.
- **Expected vs actual behaviour.**
- **Diagnostics JSON** — attach the file you saved above.
- **Debug log file** — if you turned on debug logging, attach the downloaded log too.

