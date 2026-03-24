add_executable(epp_tests
    test_grid.cpp
)
target_link_libraries(epp_tests PRIVATE epp_zone_engine doctest::doctest)

add_executable(epp_calibration_tests
    test_calibration.cpp
)
target_link_libraries(epp_calibration_tests PRIVATE epp_zone_engine doctest::doctest)

add_executable(epp_tumbling_window_tests
    test_tumbling_window.cpp
)
target_link_libraries(epp_tumbling_window_tests PRIVATE epp_zone_engine doctest::doctest)

include(${doctest_SOURCE_DIR}/scripts/cmake/doctest.cmake)
doctest_discover_tests(epp_tests)
doctest_discover_tests(epp_calibration_tests)
doctest_discover_tests(epp_tumbling_window_tests)
