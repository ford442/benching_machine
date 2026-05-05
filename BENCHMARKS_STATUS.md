# Benchmark Status Reference

This document tracks which benchmarks are **real** (actual implementation exists) vs **simulated** (using multipliers for estimation).

## Summary by Config

| Config ID | Name | Status | Notes |
|-----------|------|--------|-------|
| `js_inline` | Inline Script | Simulated | Pure V8 JIT baseline |
| `js_external` | External File | Simulated | Same runtime as inline, +loading |
| `js_wasm_std` | JS + WASM | Real | Standard WebAssembly loading |
| `js_terser` | JS + Terser | Simulated | Minor compilation overhead |
| `js_closure` | Closure Compiler | Simulated | Advanced optimizations |
| `js_esbuild` | esbuild | Simulated | Modern Go-based bundler |
| `js_swc` | SWC | Simulated | Rust-based transpiler |
| `js_tsc` | TypeScript (tsc) | Simulated | Official TS compiler |
| `js_bigint` | JS BigInt | Simulated | BigInt math is slower than float |
| `wasm_rust` | Rust (wasm-pack) | Real | Build: `npm run build:rust` |
| `wasm_cheerp` | Cheerp (C++) | Simulated | Requires Cheerp toolchain (not in most envs) |
| `wasm_emcc` | Emscripten (C) | Simulated | Pure C→WASM baseline |
| `wasm_javy` | Javy (JS→WASM) | Simulated | JS-in-WASM has overhead |
| `wasm_as` | AssemblyScript Suite | Real | Build: `npm run build:physics` |
| `wasm_simd` | WASM + SIMD | Real | SIMD vector operations |
| `wasm_threads` | WASM + Threads | Real | SharedArrayBuffer support |
| `wasm_openmp` | WASM + OpenMP | Real | Build: `npm run build:omp` |
| `wasm_max` | WASM Max | Real | Threads + SIMD (no OpenMP) |
| `wasm64` | WASM64 | Simulated | 64-bit memory addressing (new) |
| `wasmfs` | WASMFS | Simulated | In-memory filesystem (new) |
| `webgl_compute` | WebGL Compute | Real | Fragment shader compute (browser) |
| `webgpu_compute` | WebGPU Compute | Real | Compute shader (Chrome 113+) |

## Building Real WASM Benchmarks

### Prerequisites

See `CLAUDE.md` for detailed toolchain setup. Quick checklist:

- Node.js ≥ 18
- Rust + cargo (for `wasm_rust`): https://rustup.rs
- wasm-pack (for `wasm_rust`): `npm install -g wasm-pack`
- Emscripten (for threads/SIMD/OpenMP): https://emscripten.org/docs/getting_started
- AssemblyScript (for `wasm_as`): `npm install -g assemblyscript`
- Binaryen (for `wasm-opt`): `npm install -g binaryen`
- WasmEdge (for AOT, optional): https://wasmedge.org/docs/start/install

### Build Commands

```bash
# Rust → WASM (wasm_rust)
npm run build:rust

# AssemblyScript suite with wasm-opt and WasmEdge AOT (wasm_as)
npm run build:physics

# Emscripten: OpenMP + Threads (wasm_openmp, wasm_max)
npm run build:omp

# All WASM at once
npm run build:all-wasm

# Cheerp (C++ → WASM) — requires Cheerp toolchain
npm run build:cheerp
```

## GPU Benchmarks (Browser Only)

GPU benchmarks **only run in the browser**. The CLI simulates them with CPU multipliers.

| Config | WebGL | WebGPU | Notes |
|--------|-------|--------|-------|
| `webgl_compute` | ✓ | ✗ | Works in all modern browsers |
| `webgpu_compute` | ✗ | ✓ | Chrome/Edge 113+; requires COOP/COEP headers |

### Running GPU Tests

1. Start the web UI: `npm run web`
2. Click "🎮 GPU Benchmarks"
3. Observe results in hallway or chart view

If GPU tests fail to initialize:
- Ensure `public/gpu-benchmark-runner.js` is loaded
- Check browser console for `navigator.gpu` availability
- Verify COOP/COEP headers are set (dev server sets these)

## Performance Expectations

### CPU-Only Baseline (js_inline = 1.0×)
- **WASM** (no threads/SIMD): **2.3–2.5×**
- **WASM + SIMD**: **3.5×**
- **WASM + Threads**: **4.0×**
- **WASM + OpenMP**: **4.3×** (best for multi-threaded workloads)
- **WASM Max** (Threads + SIMD): **4.5×** (threads scheduling overhead can offset SIMD gains)
- **WASM64**: **2.3×** (minimal addressing overhead)
- **WASMFS**: **2.0×** (filesystem abstraction overhead)

### GPU (with RTX 3080 / equivalent)
- **WebGL Compute**: **8.0×** (shader compilation slower than WebGPU)
- **WebGPU Compute**: **12.0×** (optimized compute path)

## Baseline Scenarios

Pre-computed baseline benchmarks are available in `public/baseline-benchmarks.json`:

1. **`baseline_cpu`** — Standard CPU machine (no GPU)
   - Useful for CI/CD comparisons
   - Generated on: Intel i7/AMD Ryzen 7

2. **`baseline_gpu`** — GPU-enabled machine (NVIDIA RTX 3080)
   - Includes WebGL/WebGPU results
   - Shows GPU acceleration gains

Load baselines from the web UI:
- Click "💾 Load CPU Baseline" or "💾 Load GPU Baseline"
- View immediately without running benchmarks

## New in 2026-05

### wasm64 (64-bit Memory Addressing)
- **Status**: Simulated (ready for real testing)
- **Benefit**: Support >4GB memory spaces
- **Overhead**: ~2.3× baseline JS (same as vanilla WASM)
- **When to use**: Large dataset processing, memory-intensive algorithms
- **Caveat**: Not all browsers support WASM64 yet; older toolchains may not generate it

### wasmfs (In-Memory Filesystem)
- **Status**: Simulated (ready for real testing)
- **Benefit**: Virtual filesystem for C/C++ code expecting POSIX file I/O
- **Overhead**: ~2.0× baseline JS (VFS abstraction cost)
- **When to use**: Porting legacy C++ code that uses file operations
- **Caveat**: Not optimal for actual file I/O; for real I/O use IndexedDB bridge

## How to Generate Baseline Benchmarks

### Setup

1. Ensure all WASM toolchains are installed (see Prerequisites above)
2. Build all WASM benchmarks: `npm run build:all-wasm`
3. Start the web UI: `npm run web`

### CPU-Only Baseline

```bash
# Navigate to http://localhost:3000
# Click "▶ Run Full Suite"
# Wait for completion (~5–10 minutes)
# Results appear in Hallway and Chart views
# Save snapshot via "💾 Save Results" button
# Export JSON and store in version control
```

### GPU Baseline

Same steps, but click "🎮 GPU Benchmarks" instead.

### Multi-VM Comparison

For realistic comparison across hardware:

1. **VM 1: CPU-only**
   - Run: `npm run web` → "▶ Run Full Suite"
   - Export results to `baseline-cpu-<platform>-<date>.json`

2. **VM 2: GPU-enabled**
   - Run: `npm run web` → "🎮 GPU Benchmarks"
   - Export results to `baseline-gpu-<platform>-<date>.json`

3. **Merge and deploy**
   - Update `public/baseline-benchmarks.json` with new scenarios
   - Commit to repo
   - Users can now "💾 Load [CPU|GPU] Baseline" without waiting

## Testing New Configs

When adding a new config (e.g., `wasm_simdx4`):

1. **Add to `backend/benchmarks/configs.js`**
   - Add config object
   - Add `getMultiplier()` case with realistic estimate

2. **Add to `src/components/BenchmarkRunner.js`**
   - Mirror config in frontend `configurations[]`
   - If it's a WASM config, add to `wasmConfigs[]`
   - Add `mockRunConfig()` case if custom simulation needed

3. **Test via web UI**
   - Load baseline: "💾 Load CPU Baseline"
   - Verify new config appears in hallway/chart
   - Run "▶ Run Full Suite" to replace with real data

4. **Document status**
   - Update this file (`BENCHMARKS_STATUS.md`)
   - Mark as "Real" only if build artifacts exist
   - Record multiplier estimate for simulation

## Troubleshooting

### GPU benchmarks show 0 ops/sec
- **Cause**: Browser doesn't support WebGL2 or WebGPU
- **Fix**: Check `navigator.gpu` in console; try Chrome/Edge latest

### WASM modules fail to load
- **Cause**: Artifacts not built or wrong path
- **Fix**: Run `npm run build:all-wasm` and rebuild frontend

### Baseline JSON won't load
- **Cause**: Path incorrect or CORS issue
- **Fix**: Ensure `public/baseline-benchmarks.json` exists; clear browser cache

### Multipliers seem unrealistic
- **Cause**: Running on different hardware than baseline
- **Fix**: Generate new baseline on target hardware; ratios matter more than absolute values

---

**Last Updated**: May 5, 2026
**Maintainers**: Benchmark suite team
