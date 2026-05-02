# Logging

The per-component log levels for the device firmware are useful when you're debugging an unfamiliar problem: raise the level on the relevant component, reproduce the issue, read the logs. Once you're done, set everything back to **None** so the you're not paying for verbose logging that you don't need.

The controls live under **Settings → Logging** in the panel.

## Components

Each row is a logical group of log tags inside the firmware. Set the level high to see more from that group. Leave it at **None** to use the firmware's compiled-in default (effectively quiet: errors and the firmware's own boot output).

![Logging settings.](../../images/settings/logging/logging.png "Logging settings.")


| Component | What it covers |
| --- | --- |
| **System** | Framework-level logs: OTA, API client, mDNS, I²C, sensor drivers (LD2450, SHTC3, BH1750, SEN0609). |
| **Zone Engine** | The zone-detection engine itself: target tracking, cell mapping, the zone state machine, configuration changes. Raise this when a zone is misbehaving. |
| **LED** | LED control script: mode transitions and the decision tree that picks the displayed colour. |
| **Network** | Wi-Fi or Ethernet connection events, DHCP, link state. |
| **Bluetooth** | BLE scanner and proxy logs. Only shown when Bluetooth is enabled on the device. |
| **CO2** | SCD4x sensor logs. Only shown when the optional CO₂ module is fitted and enabled. |

## Levels

| Level | What you get |
| --- | --- |
| **None** | **Default.** Use the firmware's compiled-in level. |
| **Error** | Only error-class messages. |
| **Warning** | Errors and warnings. |
| **Info** | Notable events: state transitions, configuration applied. |
| **Debug** | Frame-by-frame detail. Quite chatty; expect a lot of output, especially from Zone Engine. |

The levels are cumulative: Debug includes everything below it.

## Reading the logs

Setting the firmware level here is only half the picture: messages don't reach Home Assistant's logs until you also enable debug logging on the integration. See [Troubleshooting → Capture debug logs](../troubleshooting.md#capture-debug-logs) for the full walkthrough.

## Resetting

Each row has a **↺ reset** button that returns just that component to **None**.

## Where to next

- **[Automations →](../automations.md)** — wire Occupancy and zone-presence entities into Home Assistant automations.
