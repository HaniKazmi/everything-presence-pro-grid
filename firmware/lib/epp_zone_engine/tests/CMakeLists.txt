add_executable(epp_tests
    test_grid.cpp
)
target_link_libraries(epp_tests PRIVATE epp_zone_engine doctest::doctest)

add_executable(epp_calibration_tests
    test_calibration.cpp
)
target_link_libraries(epp_calibration_tests PRIVATE epp_zone_engine doctest::doctest)

add_executable(epp_zone_engine_tests
    test_zone_engine.cpp
)
target_link_libraries(epp_zone_engine_tests PRIVATE epp_zone_engine doctest::doctest)

add_executable(epp_parity_tests test_parity.cpp)
target_link_libraries(epp_parity_tests PRIVATE epp_zone_engine doctest::doctest nlohmann_json::nlohmann_json)
target_compile_definitions(epp_parity_tests PRIVATE
    EPP_FIXTURE_PATH="${CMAKE_CURRENT_SOURCE_DIR}/fixtures/parity_scenarios.json"
)

add_executable(epp_rolling_window_tests
    test_rolling_window.cpp
)
target_link_libraries(epp_rolling_window_tests PRIVATE epp_zone_engine doctest::doctest)

add_executable(epp_relay_tests
    test_relay.cpp
)
target_link_libraries(epp_relay_tests PRIVATE epp_zone_engine doctest::doctest)

add_executable(epp_zone_engine_logging_tests
    test_zone_engine_logging.cpp
)
target_link_libraries(epp_zone_engine_logging_tests PRIVATE epp_zone_engine doctest::doctest)

include(${doctest_SOURCE_DIR}/scripts/cmake/doctest.cmake)
doctest_discover_tests(epp_tests)
doctest_discover_tests(epp_calibration_tests)
doctest_discover_tests(epp_zone_engine_tests)
doctest_discover_tests(epp_parity_tests)
doctest_discover_tests(epp_rolling_window_tests)
doctest_discover_tests(epp_relay_tests)
doctest_discover_tests(epp_zone_engine_logging_tests)
