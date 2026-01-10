#!/usr/bin/env bash
set -euo pipefail

PHYSICS_WASM=public/benchmarks/physics/candy_physics.wasm
command -v wasmedgec >/dev/null || { echo "wasmedgec missing; skipping"; exit 0; }

wasmedge compile --optimize=3 --enable-all "$PHYSICS_WASM" "${PHYSICS_WASM}" 
echo "wasmedgec -> ${PHYSICS_WASM}"
