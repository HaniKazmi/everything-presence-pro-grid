#pragma once

#include "esphome/core/component.h"

namespace epp {

class EPPComponent : public esphome::Component {
 public:
  void setup() override;
  void loop() override;
  float get_setup_priority() const override;
};

}  // namespace epp
