#!/usr/bin/env bash
set -euo pipefail

PHYSICS_WASM=public/benchmarks/physics/candy_physics.wasm
command -v wasm-opt >/dev/null || { echo "wasm-opt missing; skipping"; exit 0; }

wasm-opt "$PHYSICS_WASM" -o "$PHYSICS_WASM" -O4 --converge --strip-debug \
  --enable-simd --enable-threads --enable-bulk-memory --enable-relaxed-simd \
  --enable-nontrapping-float-to-int --enable-exception-handling || true

echo "wasm-opt -> $PHYSICS_WASM"