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
# Include-path-only access to the header-only event codec (format_event_code),
# so the parity test can turn each emitted epp::Event into its wire code and
# assert event-level parity with the TS replica. Header-only: no link edge
# back to epp_component_helpers, so this does NOT create a link cycle (the
# helpers tests already cross-reference the engine sources the other way).
# epp_event_codec.h pulls in epp_json_writer.h (for EventQueue), so both
# headers live on the same include dir below.
target_include_directories(epp_parity_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../epp_component_helpers/include
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

# Zone-config parser test — exercises the ArduinoJson-based helper shared by
# both set_zones() and restore_from_nvs_() in the firmware component.
add_executable(epp_zone_config_parser_tests
    test_zone_config_parser.cpp
)
target_link_libraries(epp_zone_config_parser_tests PRIVATE epp_zone_engine doctest::doctest)
target_include_directories(epp_zone_config_parser_tests PRIVATE
    ${arduinojson_SOURCE_DIR}/src
)

include(${doctest_SOURCE_DIR}/scripts/cmake/doctest.cmake)
doctest_discover_tests(epp_tests)
doctest_discover_tests(epp_calibration_tests)
doctest_discover_tests(epp_zone_engine_tests)
doctest_discover_tests(epp_parity_tests)
doctest_discover_tests(epp_rolling_window_tests)
doctest_discover_tests(epp_relay_tests)
doctest_discover_tests(epp_zone_engine_logging_tests)
doctest_discover_tests(epp_zone_config_parser_tests)
