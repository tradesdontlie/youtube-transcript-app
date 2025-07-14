#!/bin/bash

# Alternative build approach using macOS SDK workarounds

echo "Setting up build environment..."

# Source cargo environment
source ~/.cargo/env

# Set SDK paths
export SDKROOT="/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk"

# Try to build with minimal flags first
cd "$(dirname "$0")/claudia-vision-notebook/src-tauri"

# Clean previous build
echo "Cleaning previous build..."
cargo clean

# Try building with specific target and minimal features
echo "Building Tauri app with minimal configuration..."
MACOSX_DEPLOYMENT_TARGET=11.0 cargo build --target aarch64-apple-darwin 2>&1