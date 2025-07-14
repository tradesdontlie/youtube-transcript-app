#!/bin/bash

# Source cargo environment
source ~/.cargo/env

# Set SDK paths
export SDKROOT="/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk"
export CPATH="/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include"
export LIBRARY_PATH="/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib"

# Set compiler flags to use the SDK
export CFLAGS="-isysroot $SDKROOT"
export CXXFLAGS="-isysroot $SDKROOT"
export LDFLAGS="-L$SDKROOT/usr/lib"

# Set additional flags for problematic modules
export CFLAGS="$CFLAGS -Wno-error=implicit-function-declaration"
export CXXFLAGS="$CXXFLAGS -Wno-error=implicit-function-declaration"

# Clean and build
cd "$(dirname "$0")/claudia-vision-notebook/src-tauri"
echo "Cleaning previous build..."
cargo clean

echo "Building Tauri app with fixed SDK paths..."
cargo build 2>&1