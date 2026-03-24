cmake_minimum_required(VERSION 3.14)
project(epp_zone_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Library
add_library(epp_zone_engine
    src/epp_grid.cpp
    src/epp_tumbling_window.cpp
    src/epp_zone_engine.cpp
    src/epp_calibration.cpp
)
target_include_directories(epp_zone_engine PUBLIC include)

# Tests
option(EPP_BUILD_TESTS "Build tests" ON)
if(EPP_BUILD_TESTS)
    enable_testing()
    include(FetchContent)
    FetchContent_Declare(
        doctest
        GIT_REPOSITORY https://github.com/doctest/doctest.git
        GIT_TAG v2.4.11
    )
    FetchContent_MakeAvailable(doctest)

    add_subdirectory(tests)
endif()
