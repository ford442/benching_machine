# Benchmark Implementation Status

This document tracks the implementation status of various benchmarks in the suite.

## Status Summary

| Benchmark | Environment | Status | Notes |
|-----------|-------------|--------|-------|
| **Compilation** | CLI / Web | ✅ **Real** | Uses `new WebAssembly.Module()` with inline binary. |
| **Rust** | Web | ✅ **Real** | Built via `wasm-pack`. Artifacts in `public/benchmarks/rust/`. |
| **Swarm (WASM Max)** | Web | ✅ **Real** | Built via `emcc` (OpenMP/Pthreads). Artifacts in `public/wasm/`. |
| **Physics** | Web | ✅ **Real** | AssemblyScript artifacts in `public/benchmarks/physics/`. |
| **Cheerp** | Web | ⚠️ **Simulated** | Requires Cheerp toolchain. Fallback used if artifacts missing. |
| **GPU Compute** | CLI | ⚠️ **Simulated** | Uses CPU approximation (e.g. JS Matrix Multiply). |
| **GPU Compute** | Web | ✅ **Real** | Uses WebGL/WebGPU in browser. |

## Build Instructions

To rebuild the "Real" benchmarks, ensure you have the necessary tools installed:

### Prerequisites
- Node.js & npm
- Rust & Cargo (`rustc`, `cargo`)
- Emscripten (`emcc` from `emsdk`)
- `wasm-pack` (`npm install -g wasm-pack`)

### Building
Run the following commands:

```bash
# Build Rust Benchmarks
npm run build:rust

# Build Swarm / WASM Max Benchmarks
npm run build:omp

# Build Physics (AssemblyScript)
npm run build:physics
```

## Simulated Workloads

### Cheerp (C++)
The Cheerp benchmark requires the [Cheerp compiler](https://leaningtech.com/cheerp/).
If installed:
```bash
npm run build:cheerp
```
If not installed, the benchmark runner will detect missing files and use simulated results (mock data).

### GPU Benchmarks (CLI)
Since Node.js does not have a native GPU context (WebGL/WebGPU), the CLI runner uses pure JavaScript CPU implementations to approximate the workload. These are labeled as "CPU" variations in the CLI output.
