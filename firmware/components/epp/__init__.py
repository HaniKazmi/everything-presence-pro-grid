"""EPP Zone Engine ESPHome external component."""

import os

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import binary_sensor
from esphome.components import sensor
from esphome.components import text_sensor
from esphome.components import switch
from esphome.const import CONF_ID

CODEOWNERS = ["@clintongormley"]
DEPENDENCIES = ["json"]
AUTO_LOAD = ["binary_sensor", "sensor", "text_sensor", "switch"]

epp_ns = cg.esphome_ns.namespace("epp")
EPPComponent = epp_ns.class_("EPPComponent", cg.Component)

CONF_DEVICE_TRACKING = "device_tracking"
CONF_FIRMWARE_VERSION = "firmware_version"
CONF_ZONE_OCCUPANCY = "zone_occupancy"
CONF_TARGET_POSITIONS = "target_positions"
CONF_RAW_TARGET_POSITIONS = "raw_target_positions"
CONF_ZONE_STATE = "zone_state"
CONF_CONFIG_PROTOCOL = "config_protocol"
CONF_STATIC_PRESENCE = "static_presence"
CONF_MOTION_PRESENCE = "motion_presence"
CONF_STATIC_PRESENCE_OUTPUT = "static_presence_output"
CONF_MOTION_PRESENCE_OUTPUT = "motion_presence_output"
CONF_OCCUPANCY_OUTPUT = "occupancy_output"
CONF_RELAY_SWITCH = "relay_switch"

ZONE_OCCUPANCY_SCHEMA = cv.Schema({cv.Optional(f"zone_{i}"): binary_sensor.binary_sensor_schema() for i in range(8)})

TARGET_POSITIONS_SCHEMA = cv.Schema({cv.Optional(f"target_{i}"): text_sensor.text_sensor_schema() for i in range(3)})

RAW_TARGET_POSITIONS_SCHEMA = cv.Schema(
    {cv.Optional(f"target_{i}"): text_sensor.text_sensor_schema() for i in range(3)}
)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(EPPComponent),
        cv.Optional(CONF_DEVICE_TRACKING): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_FIRMWARE_VERSION): text_sensor.text_sensor_schema(),
        cv.Optional(CONF_ZONE_OCCUPANCY): ZONE_OCCUPANCY_SCHEMA,
        cv.Optional(CONF_TARGET_POSITIONS): TARGET_POSITIONS_SCHEMA,
        cv.Optional(CONF_RAW_TARGET_POSITIONS): RAW_TARGET_POSITIONS_SCHEMA,
        cv.Optional(CONF_ZONE_STATE): text_sensor.text_sensor_schema(),
        cv.Optional(CONF_CONFIG_PROTOCOL): sensor.sensor_schema(),
        cv.Optional(CONF_STATIC_PRESENCE): cv.use_id(binary_sensor.BinarySensor),
        cv.Optional(CONF_MOTION_PRESENCE): cv.use_id(binary_sensor.BinarySensor),
        cv.Optional(CONF_STATIC_PRESENCE_OUTPUT): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_MOTION_PRESENCE_OUTPUT): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_OCCUPANCY_OUTPUT): binary_sensor.binary_sensor_schema(),
        cv.Optional(CONF_RELAY_SWITCH): cv.use_id(switch.Switch),
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)

    # Add zone engine library
    lib_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "lib"))
    cg.add_platformio_option("lib_extra_dirs", lib_dir)
    cg.add_library("epp_zone_engine", None)

    # Device tracking binary sensor
    if CONF_DEVICE_TRACKING in config:
        sens = await binary_sensor.new_binary_sensor(config[CONF_DEVICE_TRACKING])
        cg.add(var.set_device_tracking_sensor(sens))

    # Firmware version text sensor
    if CONF_FIRMWARE_VERSION in config:
        sens = await text_sensor.new_text_sensor(config[CONF_FIRMWARE_VERSION])
        cg.add(var.set_firmware_version_sensor(sens))

    # Zone occupancy binary sensors (zones 0-7)
    # Force stable object_id "zone_N_presence" regardless of display name
    if CONF_ZONE_OCCUPANCY in config:
        zone_conf = config[CONF_ZONE_OCCUPANCY]
        for i in range(8):
            key = f"zone_{i}"
            if key in zone_conf:
                sens = await binary_sensor.new_binary_sensor(zone_conf[key])
                cg.add(var.set_zone_occupancy_sensor(i, sens))

    # Target position text sensors (targets 0-2)
    if CONF_TARGET_POSITIONS in config:
        target_conf = config[CONF_TARGET_POSITIONS]
        for i in range(3):
            key = f"target_{i}"
            if key in target_conf:
                sens = await text_sensor.new_text_sensor(target_conf[key])
                cg.add(var.set_target_position_sensor(i, sens))

    # Raw target position text sensors (targets 0-2, pre-transform)
    if CONF_RAW_TARGET_POSITIONS in config:
        raw_conf = config[CONF_RAW_TARGET_POSITIONS]
        for i in range(3):
            key = f"target_{i}"
            if key in raw_conf:
                sens = await text_sensor.new_text_sensor(raw_conf[key])
                cg.add(var.set_raw_target_sensor(i, sens))

    # Zone state text sensor (JSON at 1Hz)
    if CONF_ZONE_STATE in config:
        sens = await text_sensor.new_text_sensor(config[CONF_ZONE_STATE])
        cg.add(var.set_zone_state_sensor(sens))

    # Config protocol numeric sensor
    if CONF_CONFIG_PROTOCOL in config:
        sens = await sensor.new_sensor(config[CONF_CONFIG_PROTOCOL])
        cg.add(var.set_config_protocol_sensor(sens))

    # Static presence binary sensor input (reference to existing sensor)
    if CONF_STATIC_PRESENCE in config:
        sens = await cg.get_variable(config[CONF_STATIC_PRESENCE])
        cg.add(var.set_static_presence_sensor(sens))

    # Motion presence binary sensor input (reference to existing sensor)
    if CONF_MOTION_PRESENCE in config:
        sens = await cg.get_variable(config[CONF_MOTION_PRESENCE])
        cg.add(var.set_motion_presence_sensor(sens))

    # Sensor presence outputs (zone engine processed state)
    if CONF_STATIC_PRESENCE_OUTPUT in config:
        sens = await binary_sensor.new_binary_sensor(config[CONF_STATIC_PRESENCE_OUTPUT])
        cg.add(var.set_static_presence_output(sens))

    if CONF_MOTION_PRESENCE_OUTPUT in config:
        sens = await binary_sensor.new_binary_sensor(config[CONF_MOTION_PRESENCE_OUTPUT])
        cg.add(var.set_motion_presence_output(sens))

    if CONF_OCCUPANCY_OUTPUT in config:
        sens = await binary_sensor.new_binary_sensor(config[CONF_OCCUPANCY_OUTPUT])
        cg.add(var.set_occupancy_output(sens))

    # Relay switch reference
    if CONF_RELAY_SWITCH in config:
        sw = await cg.get_variable(config[CONF_RELAY_SWITCH])
        cg.add(var.set_relay_switch(sw))
