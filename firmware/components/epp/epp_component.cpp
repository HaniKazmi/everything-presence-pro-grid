#include "epp_component.h"
#include "esphome/core/log.h"

namespace epp {

static const char *const TAG = "epp";

void EPPComponent::setup() {
  ESP_LOGI(TAG, "EPP Zone Engine component initialized (scaffold)");
}

void EPPComponent::loop() {
  // Stub — will process LD2450 frames in Phase 3
}

float EPPComponent::get_setup_priority() const {
  return esphome::setup_priority::DATA;
}

}  // namespace epp
