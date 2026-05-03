add_executable(epp_helpers_nvs_layout_tests
    test_nvs_layout.cpp
)
target_link_libraries(epp_helpers_nvs_layout_tests PRIVATE epp_component_helpers doctest::doctest)

add_executable(epp_helpers_change_detector_tests
    test_change_detector.cpp
)
target_link_libraries(epp_helpers_change_detector_tests PRIVATE epp_component_helpers doctest::doctest)

include(${doctest_SOURCE_DIR}/scripts/cmake/doctest.cmake)
doctest_discover_tests(epp_helpers_nvs_layout_tests)
doctest_discover_tests(epp_helpers_change_detector_tests)
