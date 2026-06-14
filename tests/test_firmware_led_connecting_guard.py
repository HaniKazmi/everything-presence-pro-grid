"""The "Network Connecting" LED effect must be guarded by an API-connected check.

`control_leds_connecting` applies the looping effect after a 550ms delay. A
settings save that flips an entity's disabled_by reloads the ESPHome entry,
producing a disconnect+reconnect; applied unconditionally, the effect lands
after the reconnect's mode script and latches the LED until the next client
event. The fix re-checks api_id.is_connected() after the delay; these tests
pin that guard structurally. (See firmware/common/everything-presence-pro-base.yaml.)
"""

from pathlib import Path

import yaml

from tests.esphome_yaml import ESPHomeLoader

REPO_ROOT = Path(__file__).resolve().parents[1]


def _load_base_yaml() -> dict:
    text = (REPO_ROOT / "firmware" / "common" / "everything-presence-pro-base.yaml").read_text()
    return yaml.load(text, Loader=ESPHomeLoader)


def _find_script(scripts: list, script_id: str) -> dict | None:
    for s in scripts:
        if isinstance(s, dict) and s.get("id") == script_id:
            return s
    return None


def _is_connecting_effect_turn_on(action) -> bool:
    """True if `action` is a light.turn_on applying the Network Connecting effect."""
    if not isinstance(action, dict):
        return False
    turn_on = action.get("light.turn_on")
    return isinstance(turn_on, dict) and turn_on.get("effect") == "Network Connecting"


def test_connecting_effect_not_applied_unconditionally():
    """The effect must not be a bare top-level action — it would latch on reconnect."""
    doc = _load_base_yaml()
    script = _find_script(doc["script"], "control_leds_connecting")
    assert script is not None, "control_leds_connecting script not found in firmware YAML"
    then = script["then"]
    assert not any(_is_connecting_effect_turn_on(a) for a in then), (
        "control_leds_connecting applies the 'Network Connecting' effect "
        "unconditionally after its delay. If the API reconnects during the "
        "delay, the effect lands after the mode script's turn-off and latches "
        "the LED until the next client connect/disconnect. Guard it behind an "
        "api_id.is_connected() check."
    )


def test_connecting_effect_guarded_by_api_state():
    """The effect must live inside an `if` whose condition checks is_connected()."""
    doc = _load_base_yaml()
    script = _find_script(doc["script"], "control_leds_connecting")
    assert script is not None, "control_leds_connecting script not found in firmware YAML"

    guard_lambda = None
    for action in script["then"]:
        if not (isinstance(action, dict) and "if" in action):
            continue
        block = action["if"]
        condition = block.get("condition", {})
        lambda_src = condition.get("lambda") if isinstance(condition, dict) else None
        inner = block.get("then", [])
        if (
            isinstance(lambda_src, str)
            and "is_connected" in lambda_src
            and any(_is_connecting_effect_turn_on(a) for a in inner)
        ):
            guard_lambda = lambda_src
    assert guard_lambda is not None, (
        "Expected the 'Network Connecting' effect to be applied inside an `if` "
        "whose condition lambda checks api_id.is_connected(), so a reconnect "
        "during the delay cannot latch the effect."
    )
    # The guard must apply the effect only while the API is STILL down — a
    # NEGATED is_connected() check. Without the `!` the effect would apply when
    # connected (wrong direction, latch bug returns), yet a bare "is_connected"
    # substring check would still pass. Pin the negation explicitly.
    assert "!id(api_id).is_connected()" in "".join(guard_lambda.split()), (
        "control_leds_connecting guard must negate is_connected() (apply the "
        f"effect only while disconnected); got condition lambda: {guard_lambda!r}"
    )
