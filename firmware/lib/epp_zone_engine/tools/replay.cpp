/**
 * Replay tool: reads JSONL sensor recordings from stdin, runs them through
 * the C++ zone engine, and outputs per-tick results as JSONL to stdout.
 *
 * Usage:
 *   ./replay config.json < recording.jsonl > output.jsonl
 *
 * Config JSON format (same structure as get_config_data()):
 * {
 *   "calibration": {"perspective": [a,b,c,d,e,f,g,h], "room_width": ..., "room_depth": ...},
 *   "grid_origin_x": ..., "grid_origin_y": ..., "grid_cols": 20, "grid_rows": 20,
 *   "room_layout": {"grid_bytes": [...]},
 *   "zones": [{"id": 1, "type": "normal", "trigger": 5, ...}, ...]
 * }
 */

#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>

#include <nlohmann/json.hpp>

#include "epp_calibration.h"
#include "epp_grid.h"
#include "epp_tumbling_window.h"
#include "epp_zone_engine.h"

using json = nlohmann::json;
using namespace epp;

static ZoneType parse_zone_type(const std::string& s) {
    if (s == "entrance") return ZoneType::ENTRANCE;
    if (s == "thoroughfare") return ZoneType::THOROUGHFARE;
    if (s == "rest") return ZoneType::REST;
    if (s == "custom") return ZoneType::CUSTOM;
    return ZoneType::NORMAL;
}

static const char* target_status_str(TargetStatus s) {
    switch (s) {
        case TargetStatus::ACTIVE: return "active";
        case TargetStatus::PENDING: return "pending";
        case TargetStatus::INACTIVE: return "inactive";
    }
    return "inactive";
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " config.json < recording.jsonl" << std::endl;
        return 1;
    }

    // Load config
    std::ifstream config_file(argv[1]);
    if (!config_file.is_open()) {
        std::cerr << "Cannot open config file: " << argv[1] << std::endl;
        return 1;
    }
    json config;
    config_file >> config;

    // Set up SensorTransform
    SensorTransform transform;
    if (config.contains("calibration") && config["calibration"].contains("perspective")) {
        auto& persp = config["calibration"]["perspective"];
        if (persp.is_array() && persp.size() == 8) {
            float coeffs[8];
            for (int i = 0; i < 8; ++i) {
                coeffs[i] = persp[i].get<float>();
            }
            float room_width = config["calibration"].value("room_width", 0.0f);
            float room_depth = config["calibration"].value("room_depth", 0.0f);
            transform.set_coefficients(coeffs, room_width, room_depth);
        }
    }

    // Set up Grid
    int cols = config.value("grid_cols", GRID_COLS);
    int rows = config.value("grid_rows", GRID_ROWS);
    float origin_x = config.value("grid_origin_x", 0.0f);
    float origin_y = config.value("grid_origin_y", 0.0f);
    Grid grid(origin_x, origin_y, cols, rows, GRID_CELL_SIZE_MM);

    // Load grid bytes from room_layout if present
    if (config.contains("room_layout") && config["room_layout"].contains("grid_bytes")) {
        auto& gb = config["room_layout"]["grid_bytes"];
        if (gb.is_array()) {
            std::vector<uint8_t> bytes;
            bytes.reserve(gb.size());
            for (auto& v : gb) {
                bytes.push_back(static_cast<uint8_t>(v.get<int>()));
            }
            grid.load_from_bytes(bytes.data(), static_cast<int>(bytes.size()));
        }
    }

    // Set up zones
    std::vector<ZoneConfig> zone_configs;
    if (config.contains("zones")) {
        for (auto& z : config["zones"]) {
            ZoneConfig zc;
            zc.id = z.value("id", 0);
            zc.type = parse_zone_type(z.value("type", "normal"));
            ZoneTypeDefaults defaults = zone_type_defaults(zc.type);
            zc.trigger = z.value("trigger", defaults.trigger);
            zc.renew = z.value("renew", defaults.renew);
            zc.timeout = z.value("timeout", defaults.timeout);
            zc.handoff_timeout = z.value("handoff_timeout", defaults.handoff_timeout);
            zone_configs.push_back(zc);
        }
    }

    // Room-level zone (zone 0) from room_layout
    if (config.contains("room_layout")) {
        auto& rl = config["room_layout"];
        std::string room_type_str = rl.value("room_type", "normal");
        ZoneType room_type = parse_zone_type(room_type_str);
        ZoneTypeDefaults room_defaults = zone_type_defaults(room_type);

        ZoneConfig room_zc;
        room_zc.id = 0;
        room_zc.type = room_type;
        room_zc.trigger = rl.value("room_trigger", room_defaults.trigger);
        room_zc.renew = rl.value("room_renew", room_defaults.renew);
        room_zc.timeout = rl.value("room_timeout", room_defaults.timeout);
        room_zc.handoff_timeout = rl.value("room_handoff_timeout", room_defaults.handoff_timeout);
        zone_configs.push_back(room_zc);
    }

    // Initialize engine
    ZoneEngine engine;
    engine.set_grid(grid);
    engine.set_zones(zone_configs.data(), static_cast<int>(zone_configs.size()));

    TumblingWindow window(1.0f);

    // Read JSONL from stdin, feed through engine
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        json frame;
        try {
            frame = json::parse(line);
        } catch (const json::parse_error& e) {
            std::cerr << "Parse error: " << e.what() << std::endl;
            continue;
        }

        float t = frame.value("t", 0.0f);

        // Build target inputs: apply SensorTransform, gate y==0
        TargetInput inputs[MAX_TARGETS]{};
        auto& targets = frame["targets"];
        for (int i = 0; i < MAX_TARGETS && i < static_cast<int>(targets.size()); ++i) {
            auto& tgt = targets[i];
            float raw_x = tgt.value("x", 0.0f);
            float raw_y = tgt.value("y", 0.0f);
            bool active = tgt.value("active", false);

            // Gate y==0 (same as Python coordinator)
            if (active && raw_y == 0.0f) {
                active = false;
            }

            if (active && transform.has_perspective()) {
                auto [cx, cy] = transform.apply(raw_x, raw_y);
                // Check if inside room grid
                int cell = grid.xy_to_cell(cx, cy);
                bool inside = (cell >= 0 && grid.cell_is_room(cell));
                inputs[i] = {cx, cy, inside};
            } else {
                inputs[i] = {0.0f, 0.0f, false};
            }
        }

        // Feed through tumbling window
        bool ticked = window.feed(inputs, MAX_TARGETS, t);
        if (!ticked) continue;

        // Window ticked — run zone engine
        const WindowOutput& wo = window.output();
        const ProcessingResult& result = engine.tick(wo, t);

        // Output result as JSONL
        json out;
        out["t"] = t;

        json zone_occ = json::object();
        for (int zi = 0; zi < MAX_ZONE_SLOTS; ++zi) {
            if (result.zone_occupancy[zi]) {
                zone_occ[std::to_string(zi)] = true;
            } else {
                zone_occ[std::to_string(zi)] = false;
            }
        }
        out["zone_occupancy"] = zone_occ;

        json out_targets = json::array();
        for (int i = 0; i < result.target_count; ++i) {
            json tj;
            tj["x"] = result.targets[i].x;
            tj["y"] = result.targets[i].y;
            tj["status"] = target_status_str(result.targets[i].status);
            tj["signal"] = result.targets[i].signal;
            out_targets.push_back(tj);
        }
        out["targets"] = out_targets;
        out["tracking_present"] = result.device_tracking_present;

        std::cout << out.dump() << "\n";
    }

    return 0;
}
