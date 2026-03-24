# Firmware Phase 5: Builder & Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based firmware builder that lets end users select hardware options (WiFi/Ethernet, BLE, CO2), flash firmware via USB using ESP Web Tools, and receive OTA updates.

**Architecture:** Pre-built firmware binaries are published as GitHub Release assets by CI. A static web app (HTML/JS/CSS) presents option checkboxes and uses ESP Web Tools for browser-based flashing. OTA manifests are included in the release.

**Tech Stack:** GitHub Actions, ESP Web Tools, static HTML/JS

**Working directory:** `/workspaces/ha-dev/everything-presence-pro-grid/.worktrees/firmware/`

---

## Tasks

### Task 1: Release CI workflow

Add a GitHub Actions workflow that builds all 8 firmware variants on tag push and publishes them as release assets.

**Files:**
- Create: `.github/workflows/firmware-release.yml`

**Implementation:**
- Trigger on: `push: tags: ['v*']`
- Matrix: all 8 variants
- Steps per variant:
  1. Checkout
  2. Install ESPHome
  3. `esphome compile firmware/variants/$variant.yaml`
  4. Copy built binary to named output: `everything-presence-pro-$variant.ota.bin`
  5. Generate manifest JSON for ESP Web Tools
- After matrix: create GitHub Release, upload all binaries + manifests

ESP Web Tools manifest format:
```json
{
  "name": "Everything Presence Pro ($variant)",
  "version": "$tag",
  "builds": [
    {
      "chipFamily": "ESP32",
      "parts": [
        {"path": "everything-presence-pro-$variant.ota.bin", "offset": 0}
      ]
    }
  ]
}
```

Actually, for ESP Web Tools to flash via serial, we need the full firmware image (not just OTA). ESPHome produces several files:
- `.bin` — full flash image (for serial flashing)
- `.ota.bin` — OTA update image

We need the full `.bin` for ESP Web Tools serial flashing, and the `.ota.bin` for OTA updates.

The ESPHome build output is at:
`firmware/variants/.esphome/build/$device_name/.pioenvs/$device_name/firmware.bin`

- [ ] Step 1: Create release workflow
- [ ] Step 2: Test locally by examining build output paths
- [ ] Step 3: Commit

---

### Task 2: OTA manifest files

Generate per-variant OTA manifest JSON files for the ESPHome http_request update component.

**Files:**
- Create: `tools/firmware-builder/generate-manifests.py`

ESPHome OTA manifest format:
```json
{
  "name": "everything-presence-pro-wifi",
  "version": "1.0.0",
  "builds": [
    {
      "chipFamily": "ESP32",
      "parts": [
        {"path": "everything-presence-pro-wifi.bin", "offset": 0}
      ]
    }
  ]
}
```

The release workflow generates these manifests alongside the binaries.

- [ ] Step 1: Add manifest generation to release workflow
- [ ] Step 2: Commit

---

### Task 3: Static web app — firmware builder UI

Create a simple static web page that presents hardware options and uses ESP Web Tools for flashing.

**Files:**
- Create: `tools/firmware-builder/index.html`
- Create: `tools/firmware-builder/style.css`

**Implementation:**
- HTML page with:
  - Title: "Everything Presence Pro — Firmware Builder"
  - Three toggle switches: Network (WiFi/Ethernet), Bluetooth Proxy (on/off), CO2 Sensor (on/off)
  - "Install" button
  - ESP Web Tools `<esp-web-install-button>` element
- The manifest URL is computed from the selected options:
  `https://github.com/clintongormley/everything-presence-pro-grid/releases/latest/download/everything-presence-pro-$variant-manifest.json`
- ESP Web Tools script loaded from CDN: `https://unpkg.com/esp-web-tools@10/dist/web/install-button.js`
- Clean, modern styling

**ESP Web Tools usage:**
```html
<esp-web-install-button id="install-button" manifest="">
  <button slot="activate">Install Firmware</button>
</esp-web-install-button>

<script>
  function updateManifest() {
    const network = document.getElementById('network').value;
    const ble = document.getElementById('ble').checked;
    const co2 = document.getElementById('co2').checked;
    let variant = network;
    if (ble) variant += '-ble';
    if (co2) variant += '-co2';
    const url = `https://github.com/clintongormley/everything-presence-pro-grid/releases/latest/download/everything-presence-pro-${variant}-manifest.json`;
    document.getElementById('install-button').setAttribute('manifest', url);
  }
</script>
```

- [ ] Step 1: Create index.html with option selection and ESP Web Tools
- [ ] Step 2: Create style.css
- [ ] Step 3: Commit

---

### Task 4: Update firmware OTA URLs

Update the variant YAMLs to point OTA update URLs to our GitHub Releases.

**Files:**
- Modify: `firmware/variants/*.yaml` — uncomment and update `update:` blocks

**Implementation:**
Currently the `update:` blocks are commented out. Uncomment them and point to our releases:
```yaml
update:
  - platform: http_request
    id: update_http_request
    name: Firmware Update
    source: https://github.com/clintongormley/everything-presence-pro-grid/releases/latest/download/everything-presence-pro-$variant-manifest.json
```

- [ ] Step 1: Update all 8 variant YAMLs
- [ ] Step 2: Compile to verify
- [ ] Step 3: Commit

---

### Task 5: GitHub Pages deployment

Add a workflow to deploy the firmware builder web app to GitHub Pages.

**Files:**
- Create: `.github/workflows/pages.yml`

Simple deployment: copy `tools/firmware-builder/` contents to GitHub Pages on push to main.

- [ ] Step 1: Create pages workflow
- [ ] Step 2: Commit
