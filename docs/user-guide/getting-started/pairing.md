# Pairing your device

Everything Presence Pro Grid is a discovery-layer integration — it doesn't add devices to Home Assistant itself. Instead, it watches HA's entity registry for Everything Presence Pro devices that have already been added via the ESPHome integration, and starts managing zones for each one it finds. In practice, "pairing" means adding the device via ESPHome; Everything Presence Pro Grid picks it up automatically a moment later.

## Prerequisites

- **Everything Presence Pro Grid integration installed** in Home Assistant. If you haven't done this yet, see [Installation](../installation.md).
- **Everything Presence Pro Grid firmware running on the device.** If it's still on the original firmware, flash Everything Presence Pro Grid first — see [Firmware](../firmware.md). Everything Presence Pro Grid only recognises devices running its own firmware.
- **The device is on the same network as Home Assistant.** For Wi-Fi variants, that means connected to your Wi-Fi and reachable by IP. For Ethernet variants, plugged into the same LAN.

## How pairing works

Everything Presence Pro Grid doesn't prompt you to add a device or walk you through a setup flow. Instead, once the integration is loaded, it scans HA's entity registry for ESPHome devices whose manufacturer is **EverythingSmartechnology**, model is **Everything Presence Pro**, and which publish a `firmware_version` entity. Any device that matches gets wrapped by Everything Presence Pro Grid and shows up in the panel.

That means the work you actually need to do is to get the device added to HA via the standard ESPHome integration. Everything Presence Pro Grid takes it from there.

## Adding the device to Home Assistant

1. **Power the device on.** Give it 10–20 seconds to join the network and announce itself.
2. In Home Assistant, go to **Settings → Devices & Services**.
3. Look for a **Discovered** card for your device (ESPHome integration). If HA found it automatically, click **Configure** and follow the prompts.
4. If the device isn't discovered, click **Add Integration**, search for **ESPHome**, and enter the device's hostname (e.g. `everything-presence-pro.local`) or IP address.
5. (Optional) Assign the device to an Area. This is a standard HA concept and makes the device easier to find later.

!!! tip
    The device's name comes from the firmware's configured hostname. You can rename the device from its HA device page after pairing — Everything Presence Pro Grid follows the new name automatically.

!!! example "Screenshot placeholder"
    **HA Settings → Devices & Services showing a discovered Everything Presence Pro card.** `pairing/discovered-card.png`

## Confirming Everything Presence Pro Grid sees the device

1. Open the **Everything Presence Pro Grid panel** from the HA sidebar.
2. Your device should appear in the device list within a few seconds of being added to ESPHome.
3. If it doesn't appear: check **Settings → Devices & Services → ESPHome** and confirm the device is listed and marked online. Everything Presence Pro Grid only sees devices that ESPHome has registered and connected to successfully.

!!! example "Screenshot placeholder"
    **Everything Presence Pro Grid panel showing a single paired device in the device list.** `pairing/panel-device-list.png`

!!! note
    Everything Presence Pro Grid identifies each device by its MAC address. If you re-flash a device's firmware, or swap its role while keeping the hardware, any saved zones and calibration stay with the device — they're keyed to MAC, not to anything else.

## Where to next

- **[First boot →](first-boot.md)** — what you'll see in the panel and which entities HA creates for you.
