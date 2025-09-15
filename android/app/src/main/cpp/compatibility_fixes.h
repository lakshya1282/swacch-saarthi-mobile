#pragma once

// Compatibility fixes for C++20 features in older NDK versions
#include <type_traits>
#include <functional>

// Check C++20 support and define missing features
#if __cplusplus < 202002L || !defined(__cpp_lib_concepts)

// Define std::identity if not available
namespace std {
    struct identity {
        template<class T>
        constexpr T&& operator()(T&& t) const noexcept {
            return std::forward<T>(t);
        }
        
        using is_transparent = void;
    };
}

// Mock concepts for older C++ standards
#define concept class
#define requires(...) typename std::enable_if_t<(__VA_ARGS__), int> = 0

namespace std {
    // Mock regular concept
    template<class T>
    using regular = std::conjunction<
        std::is_default_constructible<T>,
        std::is_copy_constructible<T>,
        std::is_copy_assignable<T>,
        std::is_destructible<T>
    >;
    
    // Mock convertible_to concept  
    template<class From, class To>
    using convertible_to = std::is_convertible<From, To>;
}

#endif

// Fix for hash_combine compilation issues
#ifndef FACEBOOK_REACT_HASH_COMBINE_FIX
#define FACEBOOK_REACT_HASH_COMBINE_FIX

namespace facebook {
namespace react {

// Simplified hash_combine implementation compatible with older standards
template<typename T>
void hash_combine(std::size_t& seed, const T& v) {
    std::hash<T> hasher;
    seed ^= hasher(v) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
}

template<typename T, typename... Rest>
void hash_combine(std::size_t& seed, const T& v, const Rest&... rest) {
    hash_combine(seed, v);
    if constexpr (sizeof...(rest) > 0) {
        hash_combine(seed, rest...);
    }
}

template<typename T, typename... Args>
std::size_t hash_combine(const T& v, const Args&... args) {
    std::size_t seed = std::hash<T>{}(v);
    if constexpr (sizeof...(args) > 0) {
        hash_combine(seed, args...);
    }
    return seed;
}

} // namespace react
} // namespace facebook

#endif
