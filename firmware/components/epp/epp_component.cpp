#include "epp_component.h"
#include "esphome/core/log.h"

namespace epp {

static const char *const TAG = "epp";

void EPPComponent::setup() {
  ESP_LOGI(TAG, "EPP Zone Engine component initialized");
}

void EPPComponent::loop() {
  if (!frame_ready_)
    return;
  frame_ready_ = false;
  frame_count_++;

  if (frame_count_ % 100 == 0) {
    ESP_LOGD(TAG, "Frame %u: T1(%.0f,%.0f,%d) T2(%.0f,%.0f,%d) T3(%.0f,%.0f,%d)",
             frame_count_,
             targets_[0].x, targets_[0].y, targets_[0].detected,
             targets_[1].x, targets_[1].y, targets_[1].detected,
             targets_[2].x, targets_[2].y, targets_[2].detected);
  }
}

float EPPComponent::get_setup_priority() const {
  return esphome::setup_priority::DATA;
}

void EPPComponent::feed_targets(float x1, float y1, bool d1,
                                float x2, float y2, bool d2,
                                float x3, float y3, bool d3) {
  targets_[0] = {x1, y1, d1};
  targets_[1] = {x2, y2, d2};
  targets_[2] = {x3, y3, d3};
  frame_ready_ = true;
}

}  // namespace epp
