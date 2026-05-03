#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include <limits>
#include "epp_grid.h"
#include "epp_types.h"
#include "epp_zone_engine.h"

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

    // Negative coordinates (must use floor, not truncate, so any negative offset is OOB)
    CHECK(grid.xy_to_cell(-300.0f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, -300.0f) == -1);

    // Beyond grid extent: 20 cols * 300mm = 6000mm
    CHECK(grid.xy_to_cell(6000.0f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, 6000.0f) == -1);

    // Last valid cell
    CHECK(grid.xy_to_cell(5999.0f, 5999.0f) == 399);
}

TEST_CASE("xy_to_cell rejects small negative offsets (no truncate-toward-zero)") {
    // truncation toward zero would turn -100/300 into 0, producing cell 0 — wrong.
    epp::Grid grid;
    CHECK(grid.xy_to_cell(-1.0f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(-100.0f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(-299.0f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, -1.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, -100.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, -299.0f) == -1);

    // Same with origin offset (origin 1000,2000): x in (1000-cell_size, 1000) -> -1
    epp::Grid offset(1000.0f, 2000.0f);
    CHECK(offset.xy_to_cell(999.0f, 2000.0f) == -1);
    CHECK(offset.xy_to_cell(701.0f, 2000.0f) == -1);
    CHECK(offset.xy_to_cell(1000.0f, 1999.0f) == -1);
}

TEST_CASE("xy_to_cell rejects NaN and Inf") {
    epp::Grid grid;
    float nan = std::numeric_limits<float>::quiet_NaN();
    float inf = std::numeric_limits<float>::infinity();
    CHECK(grid.xy_to_cell(nan, 0.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, nan) == -1);
    CHECK(grid.xy_to_cell(nan, nan) == -1);
    CHECK(grid.xy_to_cell(inf, 0.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, -inf) == -1);
}

TEST_CASE("xy_to_cell rejects huge finite values without UB float-to-int cast") {
    // From malformed perspective coefficients we can get extremely large but
    // finite coords. Cast to int is UB when the float exceeds INT range, so
    // the bounds check must happen in float space before the cast.
    epp::Grid grid;
    CHECK(grid.xy_to_cell(1.0e20f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(0.0f, 1.0e20f) == -1);
    CHECK(grid.xy_to_cell(-1.0e20f, 0.0f) == -1);
    CHECK(grid.xy_to_cell(std::numeric_limits<float>::max(), 0.0f) == -1);
    CHECK(grid.xy_to_cell(std::numeric_limits<float>::lowest(), 0.0f) == -1);
}

TEST_CASE("xy_to_col_row decomposition agrees with xy_to_cell") {
    epp::Grid grid;
    int col = -999, row = -999;

    // Inside grid: returns true and yields col/row consistent with xy_to_cell.
    CHECK(grid.xy_to_col_row(450.0f, 750.0f, col, row));
    CHECK(col == 1);
    CHECK(row == 2);
    CHECK(grid.xy_to_cell(450.0f, 750.0f) == row * grid.cols() + col);

    // Negative offset: returns false (and out-params are undefined for callers).
    col = -999; row = -999;
    CHECK_FALSE(grid.xy_to_col_row(-1.0f, 0.0f, col, row));
    CHECK_FALSE(grid.xy_to_col_row(0.0f, -1.0f, col, row));

    // Beyond extent: returns false.
    CHECK_FALSE(grid.xy_to_col_row(6000.0f, 0.0f, col, row));

    // NaN: returns false.
    float nan = std::numeric_limits<float>::quiet_NaN();
    CHECK_FALSE(grid.xy_to_col_row(nan, 0.0f, col, row));
}

TEST_CASE("cell_zone / cell_is_room / cell_overlay reject out-of-bounds index") {
    epp::Grid grid;
    grid.cell(0) = 0xFF;  // sentinel; if bounds are bypassed reads still return safe defaults

    // Negative
    CHECK(grid.cell_zone(-1) == 0);
    CHECK_FALSE(grid.cell_is_room(-1));
    CHECK(grid.cell_overlay(-1) == 0);

    // Beyond cell_count
    CHECK(grid.cell_zone(grid.cell_count()) == 0);
    CHECK_FALSE(grid.cell_is_room(grid.cell_count()));
    CHECK(grid.cell_overlay(grid.cell_count()) == 0);

    // Far out of range
    CHECK(grid.cell_zone(99999) == 0);
    CHECK_FALSE(grid.cell_is_room(99999));
    CHECK(grid.cell_overlay(99999) == 0);
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

TEST_CASE("load_from_bytes ignores negative len without OOB write") {
    epp::Grid grid;
    // Pre-fill with a known pattern.
    uint8_t prefilled[3] = {0x11, 0x22, 0x33};
    grid.load_from_bytes(prefilled, 3);
    CHECK(grid.cell(0) == 0x11);

    // Negative len: must be a no-op, not write at cells_[-5..].
    uint8_t dummy = 0xFF;
    grid.load_from_bytes(&dummy, -5);
    // Original contents preserved (the negative-len call did nothing).
    CHECK(grid.cell(0) == 0x11);
    CHECK(grid.cell(1) == 0x22);
    CHECK(grid.cell(2) == 0x33);
}

TEST_CASE("load_from_bytes zeros the tail when len < cell_count") {
    epp::Grid grid;
    // Pre-load full grid with 0xFF
    uint8_t prefilled[epp::GRID_CELL_COUNT];
    for (int i = 0; i < epp::GRID_CELL_COUNT; ++i) prefilled[i] = 0xFF;
    grid.load_from_bytes(prefilled, epp::GRID_CELL_COUNT);
    CHECK(grid.cell(epp::GRID_CELL_COUNT - 1) == 0xFF);

    // Now load a shorter buffer — the tail must be zeroed, not left stale.
    uint8_t shorter[] = {0x01, 0x02, 0x03};
    grid.load_from_bytes(shorter, 3);
    CHECK(grid.cell(0) == 0x01);
    CHECK(grid.cell(1) == 0x02);
    CHECK(grid.cell(2) == 0x03);
    CHECK(grid.cell(3) == 0x00);
    CHECK(grid.cell(epp::GRID_CELL_COUNT - 1) == 0x00);
}

TEST_CASE("Grid constructor clamps cols/rows to fit fixed storage") {
    // Backing storage is std::array<uint8_t, GRID_CELL_COUNT>. The public
    // constructor accepts arbitrary cols/rows, so a malformed call could imply
    // more cells than fit. The constructor must clamp logical dimensions so
    // cell_count() <= storage size, otherwise bounds-checked accessors would
    // happily read/write past the array end.
    epp::Grid grid(0.0f, 0.0f, 30, 30, 300);
    CHECK(grid.cols() <= epp::GRID_COLS);
    CHECK(grid.rows() <= epp::GRID_ROWS);
    CHECK(grid.cell_count() <= epp::GRID_CELL_COUNT);

    // Negative dimensions clamp to 0 (no UB on unsigned conversions / loops).
    epp::Grid neg(0.0f, 0.0f, -5, -5, 300);
    CHECK(neg.cols() == 0);
    CHECK(neg.rows() == 0);
    CHECK(neg.cell_count() == 0);

    // Bounds checks must hold against the storage even after a too-large ask.
    // load_from_bytes writes up to cell_count(); on the clamped grid this stays
    // within bounds. Construct then load — must not crash / corrupt.
    uint8_t big_data[1024];
    for (int i = 0; i < 1024; ++i) big_data[i] = static_cast<uint8_t>(i & 0xFF);
    grid.load_from_bytes(big_data, 1024);
    // Just verify a sample cell is reachable; the important assertion is the
    // absence of an OOB write (caught by sanitizers / asan).
    CHECK(grid.cell(0) == 0x00);
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

TEST_CASE("clamp_threshold") {
    CHECK(epp::clamp_threshold(5) == 5);
    CHECK(epp::clamp_threshold(1) == 1);
    CHECK(epp::clamp_threshold(0) == 1);
    CHECK(epp::clamp_threshold(-3) == 1);
}

TEST_CASE("frame_count_to_signal: in-range frame counts map 1:1 to signal") {
    CHECK(epp::frame_count_to_signal(0) == 0);
    CHECK(epp::frame_count_to_signal(1) == 1);
    CHECK(epp::frame_count_to_signal(5) == 5);
    CHECK(epp::frame_count_to_signal(9) == 9);
}

TEST_CASE("frame_count_to_signal: over-delivery saturates at 9") {
    CHECK(epp::frame_count_to_signal(10) == 9);
    CHECK(epp::frame_count_to_signal(11) == 9);
    CHECK(epp::frame_count_to_signal(15) == 9);
    CHECK(epp::frame_count_to_signal(16) == 9);  // RollingWindow MAX_FRAMES
}

TEST_CASE("overlay constants") {
    CHECK(epp::CELL_OVERLAY_MASK == 0x30);
    CHECK(epp::CELL_OVERLAY_SHIFT == 4);
    CHECK(epp::CELL_OVERLAY_NONE == 0);
    CHECK(epp::CELL_OVERLAY_ENTRY == 1);
    CHECK(epp::CELL_OVERLAY_INTERFERENCE == 2);
    CHECK(epp::CELL_OVERLAY_SUPPRESS == 3);
}

TEST_CASE("cell_overlay returns kind 0..3") {
    epp::Grid grid;

    grid.cell(0) = epp::CELL_ROOM_BIT;
    CHECK(grid.cell_overlay(0) == epp::CELL_OVERLAY_NONE);

    grid.cell(0) = epp::CELL_ROOM_BIT | (epp::CELL_OVERLAY_ENTRY << epp::CELL_OVERLAY_SHIFT);
    CHECK(grid.cell_overlay(0) == epp::CELL_OVERLAY_ENTRY);

    grid.cell(0) = epp::CELL_ROOM_BIT | (epp::CELL_OVERLAY_INTERFERENCE << epp::CELL_OVERLAY_SHIFT);
    CHECK(grid.cell_overlay(0) == epp::CELL_OVERLAY_INTERFERENCE);

    grid.cell(0) = epp::CELL_ROOM_BIT | (epp::CELL_OVERLAY_SUPPRESS << epp::CELL_OVERLAY_SHIFT);
    CHECK(grid.cell_overlay(0) == epp::CELL_OVERLAY_SUPPRESS);

    // Preserves zone + room
    grid.cell(1) = epp::CELL_ROOM_BIT |
                   (3 << epp::CELL_ZONE_SHIFT) |
                   (epp::CELL_OVERLAY_INTERFERENCE << epp::CELL_OVERLAY_SHIFT);
    CHECK(grid.cell_overlay(1) == epp::CELL_OVERLAY_INTERFERENCE);
    CHECK(grid.cell_zone(1) == 3);
    CHECK(grid.cell_is_room(1));
}
