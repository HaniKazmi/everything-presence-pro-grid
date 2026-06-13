"""Pure projection: definition + source state -> exposed_entities.

This is the single source of truth for what entities a device group will
expose. The HA-side aggregator uses it to decide which entities to create;
the WebSocket API serializes the same projection to the frontend so the
panel can render the same answer without re-deriving.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any
from typing import TypedDict

from ..const import PRESENCE_SLOTS


def resolve_name_collisions(names: list[str], source_names: list[str]) -> list[str]:
    """Disambiguate passthrough zone names by prefixing the source name.

    A name is left as-is when it is unique; when the same name appears for more
    than one zone it is prefixed with its source device name (e.g. two "Desk"
    zones become "Left Bedroom Desk" / "Right Bedroom Desk"). Shared by the
    projection (preview) and the binary_sensor platform (real entities) so the
    two never disagree.
    """
    counts = Counter(names)
    return [f"{src} {name}" if counts[name] > 1 else name for name, src in zip(names, source_names, strict=True)]


@dataclass(frozen=True)
class ZoneState:
    index: int
    name: str
    enabled: bool


@dataclass(frozen=True)
class SourceState:
    mac: str
    name: str
    enabled_presence: list[str]
    zones: list[ZoneState]


class ExposedEntities(TypedDict):
    presence: list[str]
    zones: list[dict[str, Any]]


def derive_exposed_entities(
    sources: list[SourceState],
    zone_groups: list[dict[str, Any]],
) -> ExposedEntities:
    """Compute the projection of what entities will exist on the helper."""
    return {
        "presence": _project_presence(sources),
        "zones": _project_zones(sources, zone_groups),
    }


def _project_presence(sources: list[SourceState]) -> list[str]:
    enabled_union = {p for src in sources for p in src.enabled_presence}
    return [slot for slot in PRESENCE_SLOTS if slot in enabled_union]


def _project_zones(
    sources: list[SourceState],
    zone_groups: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    grouped_keys: set[tuple[str, int]] = set()
    for group in zone_groups:
        for member in group["members"]:
            grouped_keys.add((member["mac"], member["zone_index"]))

    # Passthroughs: any enabled zone not in a group, in (source order, index order).
    passthroughs: list[dict[str, Any]] = []
    for src in sources:
        for zone in sorted(src.zones, key=lambda z: z.index):
            if not zone.enabled:
                continue
            if (src.mac, zone.index) in grouped_keys:
                continue
            passthroughs.append(
                {
                    "kind": "passthrough",
                    "mac": src.mac,
                    "zone_index": zone.index,
                    "name": zone.name,
                    "available": True,
                    "_source_name": src.name,  # stripped after collision resolution
                }
            )

    # Resolve name collisions by prefixing source name.
    resolved = resolve_name_collisions(
        [p["name"] for p in passthroughs],
        [p["_source_name"] for p in passthroughs],
    )
    for p, name in zip(passthroughs, resolved, strict=True):
        p["name"] = name
        del p["_source_name"]

    # Grouped entities.
    grouped_out: list[dict[str, Any]] = []
    source_by_mac = {s.mac: s for s in sources}
    for group in zone_groups:
        any_enabled = False
        for member in group["members"]:
            member_src = source_by_mac.get(member["mac"])
            if member_src is None:
                continue
            for zone in member_src.zones:
                if zone.index == member["zone_index"] and zone.enabled:
                    any_enabled = True
                    break
            if any_enabled:
                break
        grouped_out.append(
            {
                "kind": "group",
                "id": group["id"],
                # Merged zones are zone sensors too — name them like the rest
                # ("Zone {name}").
                "name": f"Zone {group['name']}",
                "available": any_enabled,
            }
        )

    return grouped_out + passthroughs
