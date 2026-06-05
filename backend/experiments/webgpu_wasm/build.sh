#!/usr/bin/env bash
set -euo pipefail

# Build the experimental Emscripten WebGPU dispatch-overhead benchmark.
#
# Emscripten WebGPU support is still maturing. This uses the browser WebGPU
# bridge exposed by `-s USE_WEBGPU=1` and exports a small C ABI for JavaScript.

if [ -f "../../../emsdk/emsdk_env.sh" ]; then
    source "../../../emsdk/emsdk_env.sh"
fi

if [ -f "/content/build_space/emsdk/emsdk_env.sh" ]; then
    source "/content/build_space/emsdk/emsdk_env.sh"
fi

OUT_DIR="../../../public/wasm"
OUT_NAME="webgpu_bench"
OPT_LEVEL="${OPT_LEVEL:--O3}"

mkdir -p "$OUT_DIR"

echo "Building WebGPU WASM benchmark with ${OPT_LEVEL}..."

emcc main.cpp -o "${OUT_DIR}/${OUT_NAME}.js" \
  -std=c++17 \
  "${OPT_LEVEL}" \
  -s USE_WEBGPU=1 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=createWebGPUWasmBenchmark \
  -s ENVIRONMENT=web \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s "EXPORTED_FUNCTIONS=['_initializeWebGPUDevice','_isWebGPUDeviceReady','_hasWebGPUDeviceFailed','_runGenerativeShaderOverhead']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']"

echo "Build complete:"
echo "  ${OUT_DIR}/${OUT_NAME}.js"
echo "  ${OUT_DIR}/${OUT_NAME}.wasm"
