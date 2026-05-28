# Device Groups

A single Everything Presence Pro Grid sensor may not cover a whole room. Device
Groups let you combine 2 or more physical sensors into a single virtual device
in Home Assistant — so automations can target "Master Bedroom" without ORing
multiple sensors by hand.

A device group exposes:

- One **occupancy** binary sensor that is on if any source sensor's occupancy
  is on.
- The same for **static presence**, **motion presence**, **target presence**,
  and **mmWave presence** — each only created if at least one source has that
  entity enabled.
- One binary sensor per **zone** on each source — passing through with the
  zone's original name.
- One binary sensor per **zone group** you define — for combining zones from
  different sources into a single named area (e.g. left-bed + right-bed → bed).

If a source goes offline, the device group ignores it. The helper becomes
unavailable only when every source is unavailable.

## Creating a device group

1. Open the Everything Presence Pro Grid panel.
2. Switch to the **Device Groups** tab.
3. Click **+ Add device group**.
4. Give it a name (e.g. "Master Bedroom Presence").
5. Tick the source devices it should aggregate.
6. Optionally drag zones from the available list into a merge group, and name
   that group (e.g. "Bed"). Each merge group becomes one binary sensor.
7. Click **Save**.

The new virtual device appears under **Settings → Devices & Services → EPP Grid**
with all its aggregated entities.

## Editing or deleting

Click any device group in the list to reopen the editor. Save to apply
changes, or click **Delete** to remove the group and all its helper entities.

## What happens when…

| Event | Behavior |
|---|---|
| A source device goes offline | It's ignored. Helper still tracks the rest. |
| You delete a zone on a source | If it was in a merge group, the group keeps its definition but the entity goes unavailable. Add another zone to the group or delete it. |
| You rename a source device or zone | Display names update; the helper's entities keep their unique IDs and don't break. |
| You remove a source device entirely | Its MAC drops out of the group's source list. If the group has no remaining sources, it becomes a stub. |
