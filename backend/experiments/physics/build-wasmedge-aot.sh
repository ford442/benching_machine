#!/usr/bin/env bash
set -euo pipefail

PHYSICS_WASM=public/benchmarks/physics/candy_physics.wasm
command -v wasmedgec >/dev/null || { echo "wasmedgec missing; skipping"; exit 0; }

wasmedgec "$PHYSICS_WASM" -o "${PHYSICS_WASM%.wasm}.aot" --optimize=3 --enable-all

echo "wasmedgec -> ${PHYSICS_WASM%.wasm}.aot"