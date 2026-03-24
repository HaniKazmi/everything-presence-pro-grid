#define DOCTEST_CONFIG_IMPLEMENT_WITH_MAIN
#include <doctest/doctest.h>
#include "epp_types.h"

TEST_CASE("constants match expected values") {
    CHECK(epp::GRID_COLS == 20);
    CHECK(epp::GRID_ROWS == 20);
    CHECK(epp::GRID_CELL_COUNT == 400);
    CHECK(epp::GRID_CELL_SIZE_MM == 300);
    CHECK(epp::CELL_ROOM_BIT == 0x01);
    CHECK(epp::MAX_TARGETS == 3);
    CHECK(epp::MAX_ZONES == 7);
}
