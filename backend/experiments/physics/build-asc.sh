#!/usr/bin/env bash
set -euo pipefail

OUT=public/benchmarks/physics
mkdir -p "$OUT"
PHYSICS_SRC=assembly/index.ts
PHYSICS_WASM="$OUT/candy_physics.wasm"

command -v asc >/dev/null || { echo "asc missing; skipping"; exit 0; }

asc "$PHYSICS_SRC" \
  --outFile "$PHYSICS_WASM" \
  --textFile "$OUT/candy_physics.wat" \
  --sourceMap --shrinkLevel 0 --optimize --converge --optimizeLevel 3 \
  --enable simd --enable relaxed-simd --enable bulk-memory --initialMemory 384 \
  --target wasm-gc --enable reference-types --enable gc --exportRuntime --bindings esm

echo "asc -> $PHYSICS_WASM"