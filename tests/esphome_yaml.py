"""Shared YAML loader for ESPHome firmware tests.

ESPHome's YAML uses custom tags (!lambda, !include, !secret, !extend, ...)
that PyYAML's SafeLoader rejects. Tests that just need to inspect structural
fields don't care about the lambda contents — this loader treats every
custom tag as an opaque scalar / sequence / mapping so the file parses.
"""

import yaml


class ESPHomeLoader(yaml.SafeLoader):
    """SafeLoader that treats ESPHome custom tags as opaque values."""


def _esphome_tag_passthrough(loader, node):
    if isinstance(node, yaml.ScalarNode):
        return loader.construct_scalar(node)
    if isinstance(node, yaml.SequenceNode):
        return loader.construct_sequence(node, deep=True)
    return loader.construct_mapping(node, deep=True)


ESPHomeLoader.add_constructor(None, _esphome_tag_passthrough)
