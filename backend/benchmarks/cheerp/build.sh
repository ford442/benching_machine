#!/bin/bash
# Requires Cheerp installed: https://leaningtech.com/cheerp/
# Run: cheerp-wasm -o ../../../public/benchmarks/cheerp/cheerp_benchmark.js cheerp_benchmark.cpp

if ! command -v cheerp-wasm &> /dev/null
then
    echo "cheerp-wasm could not be found. Please install Cheerp to build Cheerp benchmarks."
    echo "Falling back to simulated results."
    exit 0
fi

cheerp-wasm -o ../../../public/benchmarks/cheerp/cheerp_benchmark.js cheerp_benchmark.cpp
echo "Cheerp WASM built to public/benchmarks/cheerp"
