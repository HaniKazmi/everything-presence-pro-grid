# Firmware upgrades

Once a device is running Everything Presence Pro Grid firmware and on your network, updates happen over the air. No USB cable needed.

## Over-the-air updates (OTA)

1. The **Flash Firmware** tab lists your devices and their firmware versions.
2. When a newer firmware version is available, an **Update** button appears next to the device with an "Update needed" badge.
3. Click **Update**. The device downloads the new firmware and flashes itself. Progress streams live to the panel.
4. The device reboots automatically when done. The panel reports success or, on failure, an error reason and a Retry button.

![Installed Devices list with an Update button and "Update needed" badge on one device.](../images/firmware-upgrades/ota-available.png 'Installed Devices list with an Update button and "Update needed" badge on one device.')

!!! note
    The firmware also publishes an ESPHome `update` entity (display name **Firmware Update**), so pending updates also appear on HA's standard Updates dashboard. Either place works to trigger the update; the panel gives richer progress and error reporting during the OTA.

## When OTA fails

The panel reports a specific error and offers Retry. Common causes:

- **Connection lost during update.** The device fell off the network mid-flash. Power-cycle and retry. If it keeps happening, check the Wi-Fi signal at the device or switch to the Ethernet variant.
- **Update timed out.** The device didn't finish within the expected window. Usually a one-off; retry.
- **Update failed.** The device refused the update or the flash partition is unhealthy. Retry via OTA; if that fails, re-flash via USB (see [Flashing firmware](flashing-firmware.md)).

## Integration vs firmware versions

If your firmware version is *newer* than your installed Everything Presence Pro Grid integration, the panel refuses to operate the device until the integration is updated. Look for the **Integration update required** banner and update the integration via HACS.

## Flashing a specific version

To roll back or pin to a specific firmware version, flash via USB. See [Flashing firmware](flashing-firmware.md).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| OTA stalls or times out repeatedly | Weak Wi-Fi at the device | Move the device, switch to Ethernet variant, or flash via USB. |
| OTA reports "Update failed" on every retry | Flash partition unhealthy | Re-flash via USB. |
| Panel refuses to control device | Firmware newer than installed integration | Update the integration in HACS. |
| Device disappeared from the list after a variant swap | ESPHome cache stale | Remove and re-add the device in **Settings → Devices & services → ESPHome**. |

Still stuck? See [Troubleshooting](troubleshooting.md) for how to open an issue.

## Where to next

- **[Troubleshooting →](troubleshooting.md)** — collect diagnostics and open an issue if something's not working right.
