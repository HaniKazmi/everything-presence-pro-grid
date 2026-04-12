#!/usr/bin/env bash
#
# Stage freshly-built firmware artifacts into fw/latest/ and fw/v{VERSION}/
# using the short-name convention the HA integration and ESPHome http_request
# OTA source URLs expect.
#
# Input: artifacts/everything-presence-pro-{variant}.{bin,ota.bin,-bootloader.bin,-partitions.bin}
# Output: fw/latest/{variant}.{bin,json,ota.bin,-bootloader.bin,-partitions.bin}
#         fw/v{VERSION}/{variant}.{bin,json,ota.bin,-bootloader.bin,-partitions.bin}
#
# Required env:
#   VERSION   — firmware version (e.g. "0.90.0-alpha")
#   ARTIFACTS — directory containing the long-named firmware build outputs
#
set -euo pipefail

: "${VERSION:?VERSION env var required}"
: "${ARTIFACTS:=artifacts}"

VARIANTS=(wifi-ble-co2 ethernet-ble-co2)

mkdir -p fw/latest "fw/v${VERSION}"

for VARIANT in "${VARIANTS[@]}"; do
  ART="everything-presence-pro-${VARIANT}"

  for SUFFIX in .bin .ota.bin -bootloader.bin -partitions.bin; do
    [ -f "${ARTIFACTS}/${ART}${SUFFIX}" ] \
      || { echo "missing artifact: ${ARTIFACTS}/${ART}${SUFFIX}" >&2; exit 1; }
  done

  cp "${ARTIFACTS}/${ART}.bin"             "fw/latest/${VARIANT}.bin"
  cp "${ARTIFACTS}/${ART}.ota.bin"         "fw/latest/${VARIANT}.ota.bin"
  cp "${ARTIFACTS}/${ART}-bootloader.bin"  "fw/latest/${VARIANT}-bootloader.bin"
  cp "${ARTIFACTS}/${ART}-partitions.bin"  "fw/latest/${VARIANT}-partitions.bin"

  OTA_MD5=$(md5sum "fw/latest/${VARIANT}.ota.bin" | cut -d' ' -f1)

  cat > "fw/latest/${VARIANT}.json" <<EOF
{
  "name": "Everything Presence Pro Grid (${VARIANT})",
  "version": "${VERSION}",
  "home_assistant_domain": "esphome",
  "builds": [
    {
      "chipFamily": "ESP32",
      "parts": [
        {"path": "${VARIANT}-bootloader.bin", "offset": 4096},
        {"path": "${VARIANT}-partitions.bin", "offset": 32768},
        {"path": "${VARIANT}.bin", "offset": 65536}
      ],
      "ota": {
        "path": "${VARIANT}.ota.bin",
        "md5": "${OTA_MD5}"
      }
    }
  ]
}
EOF

  for FILE in "${VARIANT}.bin" "${VARIANT}.ota.bin" "${VARIANT}-bootloader.bin" "${VARIANT}-partitions.bin" "${VARIANT}.json"; do
    cp "fw/latest/${FILE}" "fw/v${VERSION}/${FILE}"
  done
done
