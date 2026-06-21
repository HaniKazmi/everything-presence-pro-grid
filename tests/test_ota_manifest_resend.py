"""Re-issuing the OTA manifest after the firmware's empty-URL race.

The firmware's `set_update_manifest` action kicks off an asynchronous manifest
fetch and then, after a fixed 1 s delay, forces `update.perform`. On a busy
network (several devices flashing at once) that fetch can take longer than 1 s,
so the OTA starts with an empty firmware URL and no-ops ("URL not set; cannot
start update"). The manifest is warm after that first fetch, so re-issuing it
flashes from the now-populated URL.

`async_resend_ota_manifest` is the manifest-only retry the OTA progress watcher
fires on that transient failure: it re-sends `set_update_manifest` over the live
session WITHOUT rebooting (the device is idle — the failed attempt downloaded
nothing) and WITHOUT the duplicate-OTA guard.
"""

from __future__ import annotations

from unittest.mock import AsyncMock
from unittest.mock import MagicMock

import pytest
from homeassistant.core import HomeAssistant

from custom_components.eppgrid.device_manager import DeviceManager
from custom_components.eppgrid.device_manager import ManagedDevice
from custom_components.eppgrid.storage import EPPGridStore

MAC = "AA:BB:CC:DD:EE:01"


@pytest.fixture
def manager(hass: HomeAssistant) -> DeviceManager:
    return DeviceManager(hass, EPPGridStore(hass))


def _wire_device(manager: DeviceManager, *, ethernet: bool = False) -> None:
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50", device_id=None)
    manager._build_flags[MAC] = {"ethernet_enabled": ethernet}


async def test_resend_reissues_manifest_over_session_without_reboot(manager: DeviceManager) -> None:
    """It re-sends set_update_manifest with the pinned-version manifest URL over
    the live session, and must NOT reboot (the device is idle and the manifest
    is warm — a bare re-send is enough)."""
    _wire_device(manager)
    session = MagicMock()
    session.async_execute_service = AsyncMock()
    manager.get_session = MagicMock(return_value=session)
    manager.async_reboot_and_wait = AsyncMock()

    await manager.async_resend_ota_manifest(MAC)

    session.async_execute_service.assert_awaited_once()
    name = session.async_execute_service.await_args[0][0]
    payload = session.async_execute_service.await_args[0][1]
    assert name == "set_update_manifest"
    assert payload["url"].endswith("/wifi-ble-co2.json")
    manager.async_reboot_and_wait.assert_not_awaited()


async def test_resend_uses_ethernet_variant_for_ethernet_devices(manager: DeviceManager) -> None:
    _wire_device(manager, ethernet=True)
    session = MagicMock()
    session.async_execute_service = AsyncMock()
    manager.get_session = MagicMock(return_value=session)

    await manager.async_resend_ota_manifest(MAC)

    payload = session.async_execute_service.await_args[0][1]
    assert payload["url"].endswith("/ethernet-ble-co2.json")


async def test_resend_is_noop_when_no_live_session(manager: DeviceManager) -> None:
    """No live session to carry the re-send: log and return, never raise — the
    watcher's outer timeout still backstops."""
    _wire_device(manager)
    manager.get_session = MagicMock(return_value=None)

    await manager.async_resend_ota_manifest(MAC)  # must not raise


async def test_resend_is_noop_when_build_flags_unavailable(manager: DeviceManager) -> None:
    """Without build flags the manifest URL can't be resolved. Best-effort:
    return quietly rather than raising into the watcher's callback."""
    manager.devices[MAC] = ManagedDevice(mac=MAC, name="EPP", host="192.168.1.50", device_id=None)
    # no _build_flags entry
    session = MagicMock()
    session.async_execute_service = AsyncMock()
    manager.get_session = MagicMock(return_value=session)

    await manager.async_resend_ota_manifest(MAC)  # must not raise

    session.async_execute_service.assert_not_awaited()


async def test_resend_swallows_session_errors(manager: DeviceManager) -> None:
    """A failed re-send must not propagate out of the log callback path."""
    _wire_device(manager)
    session = MagicMock()
    session.async_execute_service = AsyncMock(side_effect=RuntimeError("boom"))
    manager.get_session = MagicMock(return_value=session)

    await manager.async_resend_ota_manifest(MAC)  # must not raise
