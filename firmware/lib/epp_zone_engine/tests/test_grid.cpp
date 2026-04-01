#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_grid.h"
#include "epp_types.h"

TEST_CASE("constants match expected values") {
    CHECK(epp::GRID_COLS == 20);
    CHECK(epp::GRID_ROWS == 20);
    CHECK(epp::GRID_CELL_COUNT == 400);
    CHECK(epp::GRID_CELL_SIZE_MM == 300);
    CHECK(epp::CELL_ROOM_BIT == 0x01);
    CHECK(epp::CELL_ZONE_MASK == 0x0E);
    CHECK(epp::CELL_ZONE_SHIFT == 1);
    CHECK(epp::MAX_TARGETS == 3);
    CHECK(epp::MAX_ZONES == 7);
}

TEST_CASE("xy_to_cell basic mapping") {
    // Default grid: origin (0,0), 20x20, 300mm cells
    epp::Grid grid;

    // (0, 0) -> cell 0 (col 0, row 0)
    CHECK(grid.xy_to_cell(0.0f, 0.0f) == 0);

    // (150, 0) -> still col 0 (150/300 = 0.5, int -> 0)
    CHECK(grid.xy_to_cell(150.0f, 0.0f) == 0);

    // (300, 0) -> col 1, row 0 -> cell 1
    CHECK(grid.xy_to_cell(300.0f, 0.0f) == 1);

    // (0, 300) -> col 0, row 1 -> cell 20
    CHECK(grid.xy_to_cell(0.0f, 300.0f) == 20);

    // (600, 900) -> col 2, row 3 -> cell 3*20+2 = 62
    CHECK(grid.xy_to_cell(600.0f, 900.0f) == 62);
}

TEST_CASE("xy_to_cell with origin offset") {
    epp::Grid grid(1000.0f, 2000.0f);

    // (1000, 2000) -> col 0, row 0 -> cell 0
    CHECK(grid.xy_to_cell(1000.0f, 2000.0f) == 0);

    // (1300, 2300) -> col 1, row 1 -> cell 21
    CHECK(grid.xy_to_cell(1300.0f, 2300.0f) == 21);

    // Well below origin -> out of bounds (must be >= 1 cell_size below)
    CHECK(grid.xy_to_cell(699.0f, 2000.0f) == -1);
    CHECK(grid.xy_to_cell(1000.0f, 1699.0f) == -1);
}

TEST_CASE("xy_to_cell out of bounds returns -1") {
    epp::Grid grid;

    // Negative coordinates (must be >= 1 cell_size below origin for truncation to produce -1)
    CHECK(grid.xy_to_cell(-300.0f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, -300.0f) == -1);

    // Beyond grid extent: 20 cols * 300mm = 6000mm
    CHECK(grid.xy_to_cell(6000.0f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, 6000.0f) == -1);

    // Last valid cell
    CHECK(grid.xy_to_cell(5999.0f, 5999.0f) == 399);
}

TEST_CASE("cell_zone extracts zone from cell byte") {
    epp::Grid grid;

    // Zone is bits 1-3 (mask 0x0E, shift 1)
    // Zone 0: byte = 0x00
    grid.cell(0) = 0x00;
    CHECK(grid.cell_zone(0) == 0);

    // Zone 1: bits 1-3 = 001 -> byte has 0x02 in zone bits
    grid.cell(1) = 0x02;
    CHECK(grid.cell_zone(1) == 1);

    // Zone 3: bits 1-3 = 011 -> byte has 0x06 in zone bits
    grid.cell(2) = 0x06;
    CHECK(grid.cell_zone(2) == 3);

    // Zone 7: bits 1-3 = 111 -> byte has 0x0E in zone bits
    grid.cell(3) = 0x0E;
    CHECK(grid.cell_zone(3) == 7);

    // With other bits set (room bit + training bits)
    grid.cell(4) = 0xF7;  // 1111 0111 -> zone bits = 011 -> zone 3
    CHECK(grid.cell_zone(4) == 3);
}

TEST_CASE("cell_is_room checks bit 0") {
    epp::Grid grid;

    grid.cell(0) = 0x00;
    CHECK_FALSE(grid.cell_is_room(0));

    grid.cell(0) = 0x01;
    CHECK(grid.cell_is_room(0));

    // Room bit set with zone and training bits
    grid.cell(1) = 0xFF;
    CHECK(grid.cell_is_room(1));

    // Only zone bits, no room
    grid.cell(2) = 0x0E;
    CHECK_FALSE(grid.cell_is_room(2));
}

TEST_CASE("load_from_bytes fills cells") {
    epp::Grid grid;

    uint8_t data[] = {0x01, 0x03, 0x07, 0xFF, 0x00};
    grid.load_from_bytes(data, 5);

    CHECK(grid.cell(0) == 0x01);
    CHECK(grid.cell(1) == 0x03);
    CHECK(grid.cell(2) == 0x07);
    CHECK(grid.cell(3) == 0xFF);
    CHECK(grid.cell(4) == 0x00);

    // Remaining cells should still be zero
    CHECK(grid.cell(5) == 0x00);
    CHECK(grid.cell(399) == 0x00);
}

TEST_CASE("load_from_bytes truncates to cell_count") {
    // Small grid: 2x2 = 4 cells
    epp::Grid grid(0.0f, 0.0f, 2, 2, 300);

    uint8_t data[] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};
    grid.load_from_bytes(data, 6);

    CHECK(grid.cell(0) == 0xAA);
    CHECK(grid.cell(1) == 0xBB);
    CHECK(grid.cell(2) == 0xCC);
    CHECK(grid.cell(3) == 0xDD);
    // cell(4) is backed by the array but not part of the logical grid;
    // load_from_bytes should not have written beyond cell_count()=4
    CHECK(grid.cell(4) == 0x00);
}

TEST_CASE("Grid accessors") {
    epp::Grid grid(100.0f, 200.0f, 10, 15, 250);

    CHECK(grid.origin_x() == 100.0f);
    CHECK(grid.origin_y() == 200.0f);
    CHECK(grid.cols() == 10);
    CHECK(grid.rows() == 15);
    CHECK(grid.cell_size() == 250);
    CHECK(grid.cell_count() == 150);
}

TEST_CASE("ZoneType defaults") {
    auto normal = epp::zone_type_defaults(epp::ZoneType::NORMAL);
    CHECK(normal.trigger == 5);
    CHECK(normal.renew == 3);
    CHECK(normal.timeout == 10.0f);
    CHECK(normal.handoff_timeout == 3.0f);

    auto thoroughfare = epp::zone_type_defaults(epp::ZoneType::THOROUGHFARE);
    CHECK(thoroughfare.timeout == 3.0f);

    auto rest = epp::zone_type_defaults(epp::ZoneType::REST);
    CHECK(rest.trigger == 7);
    CHECK(rest.timeout == 30.0f);

    // CUSTOM falls back to NORMAL
    auto custom = epp::zone_type_defaults(epp::ZoneType::CUSTOM);
    CHECK(custom.trigger == normal.trigger);
}

TEST_CASE("threshold_to_frame_count") {
    CHECK(epp::threshold_to_frame_count(5) == 5);
    CHECK(epp::threshold_to_frame_count(1) == 1);
    CHECK(epp::threshold_to_frame_count(0) == 1);
    CHECK(epp::threshold_to_frame_count(-3) == 1);
}

TEST_CASE("cell_has_overlay_entry") {
    epp::Grid grid;
    grid.cell(0) = epp::CELL_ROOM_BIT;
    CHECK_FALSE(grid.cell_has_overlay_entry(0));

    grid.cell(0) = epp::CELL_ROOM_BIT | epp::CELL_OVERLAY_ENTRY;
    CHECK(grid.cell_has_overlay_entry(0));

    // Preserves zone bits
    grid.cell(1) = epp::CELL_ROOM_BIT | epp::CELL_OVERLAY_ENTRY | (3 << epp::CELL_ZONE_SHIFT);
    CHECK(grid.cell_has_overlay_entry(1));
    CHECK(grid.cell_zone(1) == 3);
    CHECK(grid.cell_is_room(1));
}
