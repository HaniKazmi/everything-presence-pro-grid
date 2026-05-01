# Sensor calibration

Sensitivity and timing for the presence sensors, plus the offsets that correct the environmental readings. Lives under **Settings → Sensor Calibration** in the panel.

The motion and static-presence settings here also feed into the [sensor-assisted clear](../how-detection-works.md#sensor-assisted-clear), the rule that lets the zone engine drop *pending* zones early once both hardware sensors report inactive. Lowering a timeout therefore affects more than just that one sensor's entity: it can also shorten how long an empty room stays marked occupied.

## Motion sensor (PIR)

The Panasonic PIR is the low-latency entry trigger. See [Hardware → Motion](../hardware.md#motion-fast-infrared-motion-sensor).

![Motion sensor calibration.](../../images/settings/sensor-calibration/motion.png "Motion sensor calibration.")

| Control | Default | Notes |
| --- | --- | --- |
| **Presence timeout** | 5 s | Time after the last motion before the sensor clears. Range 0–120 s. |

The PIR has no range or sensitivity controls; it's a fixed lens on a heat-signature element. The only knob is how long it holds presence after the last movement.

## Static sensor (SEN0609)

The SEN0609 mmWave radar reports a single "someone here / not here" signal. Range is set under [Detection ranges](detection-ranges.md); the controls here govern the chip's own sensitivity and the timing around its output.

![Static sensor calibration.](../../images/settings/sensor-calibration/static.png "Static sensor calibration.")

| Control | Default | Notes |
| --- | --- | --- |
| **Presence delay** | 0 s | Delay before the sensor first reports presence. Filters brief false positives. Range 0–30 s, in 0.5 s steps. |
| **Presence timeout** | 30 s | Time after the last detection before the sensor clears. Range 0–120 s. |
| **Trigger threshold** | 3 | On-chip sensitivity for *first* detection. 0–9. Higher = harder to trigger. |
| **Renew threshold** | 3 | On-chip sensitivity for *sustaining* detection. 0–9. Higher = harder to maintain. |

The Trigger and Renew thresholds here are the SEN0609's own internal scale. They control how easily the radar chip itself decides "yes, presence". The zone-level Trigger and Renew thresholds described in [How detection works](../how-detection-works.md#the-zone-state-machine) are separate: they control how the zone engine decides whether a zone is occupied.

**Presence timeout** is load-bearing for the [sensor-assisted clear](../how-detection-works.md#sensor-assisted-clear): once the static sensor reports inactive (and the motion sensor is also inactive, and no zone is currently *occupied*), every *pending* zone is cleared immediately. Lowering this timeout speeds that up, at the cost of clearing zones a little quicker after someone genuinely leaves.

## Environmental offsets

Fixed offsets that nudge the on-board temperature, humidity, and illuminance readings towards a reference instrument. The device runs warm and is usually mounted high in a corner, so temperature and humidity readings drift accordingly. An offset gets the average closer to truth. It can't fix airflow, sun on the casing, or the device's own self-heating curve, so the readings remain trend indicators with a calibrated baseline. See [Hardware → Environmental sensors](../hardware.md#environmental-sensors).

!!! note "CO₂ module"
    The optional CO₂ add-on isn't calibrated from this page; there's no offset slider for it. To fit the module and run its forced-recalibration routine, follow Everything Smart's [CO₂ module integration guide](https://docs.everythingsmart.io/s/products/doc/integrate-the-carbon-dioxide-co2-module-biegKGfCWu).

![Environmental sensors calibration.](../../images/settings/sensor-calibration/environmental.png "Environmental sensors calibration.")

| Reading | Range | Step | Sensor |
| --- | --- | --- | --- |
| **Illuminance** | −500 to +500 lux | 1 | BH1750 |
| **Humidity** | −50 to +50 %RH | 0.1 | SHTC3 |
| **Temperature** | −20 to +20 °C | 0.1 | SHTC3 |

The offset is added to the raw reading on the device before publishing. The slider next to each row shows the *adjusted* reading in real time as you drag, so you can match it against a reference instrument without saving and waiting.

### Calibrating against a reference

1. Place a known-good thermometer, hygrometer, or lux meter next to the sensor (same spot, same airflow, same minute). Wait for both to stabilise.
2. Drag the slider for the relevant reading until the displayed value matches the reference.
3. Click **Save**.

For temperature in particular, leave the device powered up for at least 15–30 minutes before calibrating. A cold device reads close to true; one that's been on for an hour reads several degrees high. You're calibrating the *steady-state* offset.

!!! note
    A single fixed offset is a rough correction. The self-heating curve depends on ambient temperature and on how much radio traffic the device is doing, so an offset that's right at 20 °C ambient won't be exactly right at 28 °C. Aim for "close enough across normal conditions".

For illuminance, the offset is mostly useful when the BH1750 reads above the dark-room baseline you'd expect (a few lux of bias from nearby LEDs or stray light). The slider clamps the displayed value at 0 lux.

## Resetting

Each row has a **↺ reset** button that returns just that control to its default.

## Where to next

- **[LED and relay](led-relay.md)** — LED modes and the relay output.
- **[Logging](logging.md)** — per-component firmware log levels.
