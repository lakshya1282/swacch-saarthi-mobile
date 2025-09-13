cmake_minimum_required(VERSION 3.13.0)

project(WasteManagementMobile)

# Enable C++20 standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add compatibility fixes
add_compile_definitions(FOLLY_NO_CONFIG=1)
add_compile_definitions(FOLLY_MOBILE=1)
add_compile_definitions(FOLLY_USE_LIBCPP=1)
add_compile_definitions(FOLLY_CFG_NO_COROUTINES=1)

# Include compatibility fixes header
include_directories(${CMAKE_CURRENT_SOURCE_DIR})

# Create a dummy library to ensure the build system processes our compatibility fixes
add_library(compatibility_fixes INTERFACE)
target_include_directories(compatibility_fixes INTERFACE ${CMAKE_CURRENT_SOURCE_DIR})
target_compile_features(compatibility_fixes INTERFACE cxx_std_20)
