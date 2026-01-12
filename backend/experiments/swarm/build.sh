#!/usr/bin/env bash
set -euo pipefail

# Build the Swarm PoC using emscripten
# Assumes libomp.a and omp.h are in project_root/public/

#specific to my colab build system
# source /content/build_space/emsdk/emsdk_env.sh
# Attempt to source emsdk_env.sh from local emsdk directory if it exists
if [ -f "../../../emsdk/emsdk_env.sh" ]; then
    source "../../../emsdk/emsdk_env.sh"
fi

if [ -f "/content/build_space/emsdk/emsdk_env.sh" ]; then
    source "/content/build_space/emsdk/emsdk_env.sh"
fi

OUT_DIR="dist"
mkdir -p "$OUT_DIR"

# Path to public folder relative to this script
PUBLIC_DIR="../../../public"

echo "Building Swarm with OpenMP + WebGPU support..."

emcc swarm.cpp -o "$OUT_DIR/swarm.html" \
  --use-port=emdawnwebgpu \
  -s USE_PTHREADS=1 \
  -s PTHREAD_POOL_SIZE=8 \
  -s PROXY_TO_PTHREAD \
  -s TOTAL_MEMORY=256MB \
  -I"$PUBLIC_DIR" \
  -L"$PUBLIC_DIR" \
  -fopenmp \
  -lomp \
  -std=c++17 \
  -O3 --bind

echo "Build complete. Output: $OUT_DIR/swarm.html"
