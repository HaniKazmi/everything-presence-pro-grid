# Logging

Per-component log levels for the device firmware. Useful when you're debugging an unfamiliar problem — raise the level on the relevant component, reproduce the issue, read the logs. Once you're done, set everything back to **None** so the device isn't paying for verbose logging it doesn't need.

The controls live under **Settings → Logging** in the panel.

## Components

Each row is a logical group of log tags inside the firmware. Set the level high to see more from that group; leave it at **None** to use the firmware's compiled-in default (effectively quiet — errors and the firmware's own boot output).

![Logging settings.](../../images/settings/logging/logging.png "Logging settings.")


| Component | What it covers |
| --- | --- |
| **System** | Framework-level logs — OTA, API client, mDNS, I²C, sensor drivers (LD2450, SHTC3, BH1750, SEN0609). |
| **Zone Engine** | The zone-detection engine itself — target tracking, cell mapping, the zone state machine, configuration changes. The thing to raise when a zone is misbehaving. |
| **LED** | LED control script — mode transitions and the decision tree that picks the displayed colour. |
| **Network** | Wi-Fi or Ethernet connection events, DHCP, link state. |
| **Bluetooth** | BLE scanner and proxy logs. Only shown when Bluetooth is enabled on the device. |
| **CO2** | SCD4x sensor logs. Only shown when the optional CO₂ module is fitted and enabled. |

## Levels

| Level | What you get |
| --- | --- |
| **None** | **Default.** Use the firmware's compiled-in level — nothing extra. |
| **Error** | Only error-class messages. |
| **Warning** | Errors and warnings. |
| **Info** | Notable events — state transitions, configuration applied. |
| **Debug** | Frame-by-frame detail. Quite chatty; expect a lot of output, especially from Zone Engine. |

The levels are cumulative — Debug includes everything below it.

## Reading the logs

Firmware logs stream out via the integration into Home Assistant's standard log system, but to actually see them you need both the firmware *and* the integration to be talking. Two steps:

**1. Raise the firmware log level for the components you care about.** Use the dropdowns above. The default of **None** keeps the firmware quiet, so messages won't flow no matter what HA's logging is set to.

**2. Enable debug logging on the integration in Home Assistant.** Go to **Settings → Devices & services → Everything Presence Pro Grid → ⋮ → Enable debug logging**. The same thing can be done with the `logger.set_level` action — call it with `custom_components.eppgrid: debug` from **Developer tools → Actions** or from a script.

Once both are on, you can either:

- **Watch live**, at **Settings → System → Logs** in Home Assistant. Firmware messages appear inline with the integration's own output.
- **Capture a session and download it**, by clicking **Disable debug logging** on the integration page when you're done. Home Assistant writes the captured logs to a file and offers it for download — useful for attaching to a bug report.

When you're done, set the firmware components back to **None** so the device isn't paying for verbose logging it doesn't need.

## Resetting

Each row has a **↺ reset** button that returns just that component to **None**. 