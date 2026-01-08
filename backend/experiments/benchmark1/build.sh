#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="dist"
mkdir -p "$OUT_DIR"

# Build the bloat test PoC
emcc bloat_test.cpp -o "$OUT_DIR/bloat_test.html" \
  -s USE_WEBGPU=1 \
  -s USE_PTHREADS=1 \
  -s PTHREAD_POOL_SIZE=4 \
  -s PROXY_TO_PTHREAD \
  -std=c++17 \
  -O3

echo "Build complete. Output: $OUT_DIR/bloat_test.html"