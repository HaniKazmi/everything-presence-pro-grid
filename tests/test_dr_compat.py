"""Unit tests for the device-registry compat shim (`dr_compat`).

The entry-scoped registry lookups ``async_get_device_by_identifier`` /
``async_get_device_by_connection`` only exist in HA 2026.8+. eppgrid still
supports HA 2025.2 (see ``hacs.json``), so the helpers must feature-detect the
new API and fall back to the pre-2026.8 ``async_get_device(identifiers=…/
connections=…)`` lookup, which was globally unique before per-config-entry
uniqueness landed.

These tests pin the version dispatch directly with fake registries — one that
exposes the new methods (HA 2026.8+) and one that does not (HA 2025.2) — because
the installed HA under test lacks the new API, so a real-registry test could only
exercise the fallback branch.
"""

from __future__ import annotations

from custom_components.eppgrid.dr_compat import device_by_connection
from custom_components.eppgrid.dr_compat import device_by_identifier

_IDENTIFIER = ("eppgrid", "device_group:abc")
_CONNECTION = ("mac", "11:22:33:44:55:66")
_ENTRY_ID = "entry123"


class _NewRegistry:
    """HA 2026.8+ registry: exposes the entry-scoped lookups."""

    def __init__(self, result: object) -> None:
        self.result = result
        self.by_identifier_calls: list[tuple] = []
        self.by_connection_calls: list[tuple] = []
        self.bare_calls: list[tuple] = []

    def async_get_device_by_identifier(self, identifier, config_entry_id):
        self.by_identifier_calls.append((identifier, config_entry_id))
        return self.result

    def async_get_device_by_connection(self, connection, config_entry_id):
        self.by_connection_calls.append((connection, config_entry_id))
        return self.result

    def async_get_device(self, identifiers=None, connections=None):
        self.bare_calls.append((identifiers, connections))
        return self.result


class _OldRegistry:
    """HA 2025.2 registry: only the pre-2026.8 bare lookup exists."""

    def __init__(self, result: object) -> None:
        self.result = result
        self.bare_calls: list[tuple] = []

    def async_get_device(self, identifiers=None, connections=None):
        self.bare_calls.append((identifiers, connections))
        return self.result


class TestDeviceByIdentifier:
    def test_new_ha_uses_entry_scoped_lookup(self) -> None:
        sentinel = object()
        reg = _NewRegistry(sentinel)

        result = device_by_identifier(reg, _IDENTIFIER, _ENTRY_ID)

        assert result is sentinel
        assert reg.by_identifier_calls == [(_IDENTIFIER, _ENTRY_ID)]
        assert reg.bare_calls == []

    def test_old_ha_falls_back_to_bare_lookup(self) -> None:
        sentinel = object()
        reg = _OldRegistry(sentinel)

        result = device_by_identifier(reg, _IDENTIFIER, _ENTRY_ID)

        assert result is sentinel
        assert reg.bare_calls == [({_IDENTIFIER}, None)]

    def test_missing_entry_id_falls_back_to_bare_lookup(self) -> None:
        """Without a config entry to scope by, the entry-scoped API can't be used."""
        reg = _NewRegistry(object())

        device_by_identifier(reg, _IDENTIFIER, None)

        assert reg.by_identifier_calls == []
        assert reg.bare_calls == [({_IDENTIFIER}, None)]


class TestDeviceByConnection:
    def test_new_ha_uses_entry_scoped_lookup(self) -> None:
        sentinel = object()
        reg = _NewRegistry(sentinel)

        result = device_by_connection(reg, _CONNECTION, _ENTRY_ID)

        assert result is sentinel
        assert reg.by_connection_calls == [(_CONNECTION, _ENTRY_ID)]
        assert reg.bare_calls == []

    def test_missing_entry_id_falls_back_to_bare_lookup(self) -> None:
        """Case 3: an ESPHome device not yet discovered has no known entry id;
        the bare connection lookup stays correct because eppgrid never registers
        a MAC-connection device, so the match is unambiguous."""
        sentinel = object()
        reg = _NewRegistry(sentinel)

        result = device_by_connection(reg, _CONNECTION, None)

        assert result is sentinel
        assert reg.by_connection_calls == []
        assert reg.bare_calls == [(None, {_CONNECTION})]

    def test_old_ha_falls_back_to_bare_lookup(self) -> None:
        sentinel = object()
        reg = _OldRegistry(sentinel)

        result = device_by_connection(reg, _CONNECTION, _ENTRY_ID)

        assert result is sentinel
        assert reg.bare_calls == [(None, {_CONNECTION})]
