cmake_minimum_required(VERSION 3.14)
project(epp_zone_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(CMAKE_BUILD_TYPE STREQUAL "Coverage")
    add_compile_options(--coverage)
    add_link_options(--coverage)
endif()

# Library
add_library(epp_zone_engine
    src/epp_grid.cpp
    src/epp_rolling_window.cpp
    src/epp_zone_engine.cpp
    src/epp_calibration.cpp
)
target_include_directories(epp_zone_engine PUBLIC include)

# JSON library (needed by tools and tests)
include(FetchContent)
FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
)
FetchContent_MakeAvailable(json)

# Tests
option(EPP_BUILD_TESTS "Build tests" ON)
if(EPP_BUILD_TESTS)
    enable_testing()
    FetchContent_Declare(
        doctest
        GIT_REPOSITORY https://github.com/doctest/doctest.git
        GIT_TAG v2.4.11
    )
    FetchContent_MakeAvailable(doctest)

    add_subdirectory(tests)
endif()
