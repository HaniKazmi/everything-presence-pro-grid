#pragma once

#include "esphome/core/component.h"

namespace epp {

struct ParsedTarget {
  float x = 0.0f;       // mm, sensor coordinate space (transformed)
  float y = 0.0f;       // mm
  bool detected = false;
};

class EPPComponent : public esphome::Component {
 public:
  void setup() override;
  void loop() override;
  float get_setup_priority() const override;

  /// Called from LD2450 UART lambda with parsed target data
  void feed_targets(float x1, float y1, bool d1,
                    float x2, float y2, bool d2,
                    float x3, float y3, bool d3);

 protected:
  static constexpr int MAX_TARGETS = 3;
  ParsedTarget targets_[MAX_TARGETS]{};
  bool frame_ready_ = false;
  uint32_t frame_count_ = 0;
};

}  // namespace epp
