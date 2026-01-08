#!/usr/bin/env bash
set -euo pipefail

# Build the Swarm PoC using emscripten (emsdk required)
# Make sure emcc is on PATH (source emsdk_env.sh)

OUT_DIR="dist"
mkdir -p "$OUT_DIR"

emcc swarm.cpp -o "$OUT_DIR/swarm.html" \
  -s USE_WEBGPU=1 \
  -s USE_PTHREADS=1 \
  -s PTHREAD_POOL_SIZE=4 \
  -s PROXY_TO_PTHREAD \
  -std=c++17 \
  -O3

echo "Build complete. Output: $OUT_DIR/swarm.html"