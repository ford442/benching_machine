#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="dist"
mkdir -p "$OUT_DIR"

# Build the upload benchmark PoC
emcc upload_benchmark.cpp -o "$OUT_DIR/upload_benchmark.html" \
  -s USE_WEBGPU=1 \
  -fopenmp \
  -pthread \
  -s PROXY_TO_PTHREAD \
  -s PTHREAD_POOL_SIZE=8 \
  -std=c++17 \
  -O3

echo "Build complete. Output: $OUT_DIR/upload_benchmark.html"