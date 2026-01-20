#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v wasm-pack &> /dev/null
then
    echo "wasm-pack could not be found. Please install it to build Rust benchmarks."
    echo "Falling back to simulated results."
    exit 0
fi

wasm-pack build --target web --out-dir ../../../public/benchmarks/rust --no-typescript --no-pack
echo "Rust WASM built to public/benchmarks/rust"
