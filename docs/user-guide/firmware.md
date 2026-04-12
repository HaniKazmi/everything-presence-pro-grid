# Firmware

This page covers everything about the firmware running on your Everything Presence Pro device: the two shipping variants, how to flash a new device over USB, and how over-the-air (OTA) updates work once the device is on your network.

## Variants

Everything Presence Pro Grid ships two firmware variants. The only practical difference is the network interface — both include BLE and the CO2 sensor.

- **WiFi (`wifi-ble-co2`)** — pick this if your device connects via Wi-Fi. Needs SSID and password entered during flashing.
- **Ethernet (`ethernet-ble-co2`)** — pick this if your device has the Ethernet board. No Wi-Fi provisioning needed; the device shows up on the LAN after it boots.

The variant picker in the flasher shows these as **WiFi** and **Ethernet**. Pick by which interface your physical device has — there's no mix-and-match.

## First-time flash (via USB)

Flashing a brand-new device, or switching a device from the original firmware to Everything Presence Pro Grid, happens over USB from the flasher tab in the panel.

### Prerequisites

- **Chrome or Edge browser.** Flashing uses the Web Serial API, which only works in Chromium-based browsers. Firefox and Safari won't work.
- **A data USB cable.** Charge-only cables won't connect — the browser will show no ports.
- **The device plugged into the computer** running the Home Assistant web UI.

!!! warning
    If the browser shows no ports when you click Connect, the most common cause is a charge-only USB cable. Swap for a known-good data cable before blaming the device or driver.

### Flashing

1. Open the **Flash Firmware** tab in the Everything Presence Pro Grid panel.
2. Under **USB Connection**, click **Flash Firmware** (or **Connect via USB** if it's the first time).
3. In the browser's port picker, select the serial port that corresponds to your device.
4. Pick the variant — **WiFi** or **Ethernet**.
5. (Wi-Fi variant only) Configure Wi-Fi: scan for networks or enter the SSID manually, then enter the password.
6. Click **Flash**. The panel steps through: downloading firmware, flashing, rebooting, and (Wi-Fi variant) configuring and connecting to Wi-Fi. The device reboots automatically when done.

!!! example "Screenshot placeholder"
    **Flasher view — USB Connection section with Flash Firmware and Configure WiFi options.** `firmware/flasher-usb.png`

!!! example "Screenshot placeholder"
    **Flasher mid-flash — progress indicator showing "Flashing firmware…".** `firmware/flasher-progress.png`

!!! tip
    If the flash fails with "Could not connect to device", unplug the cable, hold the BOOT button on the device, plug it back in while still holding BOOT, and click Retry. The device needs to be in bootloader mode for the serial flasher to talk to it.

### Configuring Wi-Fi on an already-flashed device

If a device already has Everything Presence Pro Grid firmware but you need to change its Wi-Fi credentials (new router, moved house), you can re-provision without a full re-flash:

1. In the Flash Firmware tab, click **Configure WiFi** under USB Connection.
2. Connect via USB, scan for networks or enter the SSID manually, and enter the password.
3. Click Continue. The device gets the new credentials and connects.

## Over-the-air updates (OTA)

Once a device has Everything Presence Pro Grid firmware and is on your network, future firmware updates happen over the air. No USB cable required.

### How it works

1. The flasher tab lists your installed devices and their firmware versions.
2. When a newer firmware version is available, the panel shows an **Update** button next to the device (with an "Update needed" badge).
3. Click **Update**. The device downloads the new firmware from the Everything Presence Pro Grid GitHub Pages site and flashes itself. Progress streams live to the panel.
4. The device reboots automatically when done. The panel reports success or, on failure, an error reason and a Retry button.

!!! example "Screenshot placeholder"
    **Installed Devices list with an Update button and "Update needed" badge on one device.** `firmware/ota-available.png`

!!! note
    OTA updates don't show up as a standard Home Assistant **update** entity. You'll only see them inside the Everything Presence Pro Grid panel. If you want a dashboard card for pending firmware updates, it has to live in the Everything Presence Pro Grid panel rather than on the main HA Updates dashboard.

### When OTA fails

The panel reports specific errors — "Update timed out", "Connection lost during update", "Update failed". In all cases, Retry is offered. Common causes:

- **Connection lost during update** — the device fell off the network mid-flash. Power-cycle the device and retry. If it keeps happening, check your Wi-Fi signal at the device's location, or switch to the Ethernet variant if the hardware supports it.
- **Update timed out** — the device didn't finish within the expected window. Usually a one-off; retry.
- **Update failed** — the device refused the update or the flash partition is unhealthy. Try an OTA retry first; if that fails, re-flash via USB.

### Integration vs firmware versions

If your firmware version is *newer* than your Everything Presence Pro Grid integration, the panel will refuse to operate the device until the integration is updated. Look for the **Integration update required** banner in the panel — open it in HACS and update.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Browser port picker shows no devices | Charge-only USB cable | Swap for a data cable. |
| "Could not connect to device" during USB flash | Device not in bootloader mode | Hold BOOT, plug in USB, click Retry. |
| OTA stalls or times out repeatedly | Weak Wi-Fi at the device | Move the device, swap to Ethernet variant, or flash via USB. |
| OTA reports "Update failed" on every retry | Flash partition unhealthy | Re-flash via USB. |
| Panel refuses to control device | Firmware newer than integration | Update the integration via HACS. |
| Device disappeared from the list after a variant swap | ESPHome cache stale | Remove and re-add the device in Settings → Devices & Services → ESPHome. |

## Where to next

- **[Pairing →](getting-started/pairing.md)** — once the device has Everything Presence Pro Grid firmware, add it to Home Assistant so the integration can pick it up.
