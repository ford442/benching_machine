# WebAssembly Benchmark Module

This directory contains WebAssembly benchmarks and utilities for comparing WASM performance
with JavaScript and Rust implementations.

## Overview

WebAssembly (WASM) is a binary instruction format that runs in web browsers at near-native speed.
This module will contain:

- Pre-compiled WASM modules for benchmarking
- JavaScript wrappers for WASM functions
- Performance comparison utilities

## Example WASM Integration

```javascript
// Loading and running a WASM module
async function loadWasmModule(path) {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  const module = await WebAssembly.compile(buffer);
  const instance = await WebAssembly.instantiate(module);
  return instance.exports;
}

// Using WASM functions
async function runWasmBenchmark() {
  const wasmModule = await loadWasmModule('./benchmarks/wasm/example.wasm');
  
  // Call WASM functions
  const result = wasmModule.fibonacci(20);
  console.log('WASM Fibonacci(20):', result);
}
```

## Creating WASM Modules

### From C/C++ using Emscripten:

```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest

# Compile C to WASM
emcc fibonacci.c -o fibonacci.wasm -s WASM=1 -O3
```

### From Rust (see rust/README.md):

```bash
wasm-pack build --target web
```

### From AssemblyScript:

```bash
npm install -g assemblyscript
asc fibonacci.ts -o fibonacci.wasm --optimize
```

## Performance Considerations

WASM typically excels at:
- CPU-intensive computations
- Mathematical operations
- Data processing
- Image/video processing
- Cryptography

WASM may have overhead for:
- Frequent calls between JS and WASM
- String manipulation
- DOM operations

## TODO

- [ ] Create sample WASM modules for standard benchmarks
- [ ] Implement WASM loading and instantiation utilities
- [ ] Add performance comparison framework
- [ ] Measure compilation time vs execution time
- [ ] Document memory sharing between JS and WASM
- [ ] Add streaming compilation examples for large modules
