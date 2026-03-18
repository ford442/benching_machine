# CLAUDE.md — Benching Machine Developer Guide

## Project Purpose

Benching Machine is a benchmark suite for comparing **web compilation strategies** — not just runtime performance on a given machine, but the relative gains from different toolchains, compilers, and hardware targets. The primary analytical goal is:

> "Which compilation method wins which workload, and by how much?"

The app has two modes:
- **CLI** (`npm run bench`) — Node.js benchmark runner via Benchmark.js
- **Web UI** (`npm run web`) — React app with an immersive server rack visualization + compiler comparison charts

---

## Directory Structure

```
benching_machine/
├── backend/
│   ├── cli.js                  # CLI entry point (Commander.js)
│   ├── server.js               # Optional Express API (port 4000)
│   └── benchmarks/
│       ├── configs.js          # MASTER config list + mock runner
│       ├── compilation.js      # CLI compilation benchmarks (Benchmark.js)
│       ├── cpu.js              # CPU benchmarks (Fibonacci, Prime, Matrix)
│       ├── memory.js           # Memory benchmarks
│       ├── gpu.js              # GPU benchmarks (CPU approximations in CLI)
│       └── index.js            # Module re-exports
│   └── experiments/
│       ├── physics/            # AssemblyScript + wasm-opt + WasmEdge AOT
│       ├── swarm/              # Emscripten C++ with OpenMP/Pthreads
│       └── benchmark1/         # Misc GPU dispatch experiments
├── src/
│   ├── App.js                  # React root, state management
│   ├── index.js                # React entry point
│   ├── components/
│   │   ├── BenchmarkRunner.js  # Control panel + config runner (mirrors configs.js)
│   │   ├── HallwayVisualization.js  # View mode switcher (hallway / charts)
│   │   ├── Hallway3DView.js    # Immersive server rack view
│   │   ├── RackUnitDetail.js   # Zoomed per-rack unit detail
│   │   └── CompilerComparisonView.js  # Analytical compiler charts
│   └── utils/
│       ├── wasmLoader.js       # Dynamic WASM module loader
│       └── snapshotManager.js  # Save/load/diff benchmark snapshots
├── public/
│   ├── webgl-benchmarks.js     # WebGL fragment shader compute
│   ├── webgpu-benchmarks.js    # WebGPU WGSL compute shaders
│   └── gpu-benchmark-runner.js # GPU coordinator
├── BENCHMARKS_STATUS.md        # Real vs simulated status per benchmark
├── ARCHITECTURE.md             # System design overview
└── QUICKSTART.md               # 2-minute setup guide
```

---

## Run Commands

```bash
# Install dependencies
npm install

# Web UI (port 3000)
npm run web

# CLI benchmark runner
npm run bench
npm run bench -- --cpu
npm run bench -- --memory
npm run bench -- --compilation
npm run bench -- --gpu
npm run bench -- --output results.json

# Backend API server (port 4000, optional)
node backend/server.js

# List available CLI benchmarks
node backend/cli.js list
```

---

## Build Commands (WASM / Native)

These are required for "real" (non-simulated) WASM benchmarks. See `BENCHMARKS_STATUS.md` for what is real vs mocked.

```bash
# Rust → WASM via wasm-pack (produces public/benchmarks/rust/)
npm run build:rust

# C++ → WASM via Emscripten with OpenMP/Pthreads (produces public/wasm/)
npm run build:omp

# AssemblyScript → WASM (produces public/benchmarks/physics/)
npm run build:physics

# C++ → WASM via Cheerp (requires Cheerp toolchain installed)
npm run build:cheerp
```

### Toolchain Prerequisites

| Tool | Used By | Install |
|------|---------|---------|
| Rust + Cargo | wasm_rust | https://rustup.rs |
| wasm-pack | wasm_rust | `npm install -g wasm-pack` |
| Emscripten (emcc) | wasm_openmp, wasm_max, wasm_emcc | https://emscripten.org/docs/getting_started/downloads.html |
| AssemblyScript (asc) | wasm_as | `npm install -g assemblyscript` |
| wasm-opt | wasm_as (opt stage) | ships with binaryen — `npm install -g binaryen` |
| WasmEdge | wasm_as (AOT stage) | https://wasmedge.org/docs/start/install |
| Cheerp | wasm_cheerp | https://leaningtech.com/cheerp/ |
| Node.js ≥ 18 | all | https://nodejs.org |

---

## How to Add a New Compilation Config

1. **`backend/benchmarks/configs.js`** — add an entry to `configurations[]`:
   ```js
   {
     id: 'js_esbuild',
     name: 'esbuild',
     desc: 'Go-based bundler/minifier',
     color: '#ffcc00',
     compilation: {
       family: 'js',
       toolchain: 'esbuild',
       backend: 'Go',
       language: 'JavaScript',
       optLevel: 'minify',
       flags: ['--minify', '--bundle'],
       postProcess: [],
       status: 'simulated',  // change to 'real' when artifacts exist
     }
   }
   ```
   Add a case to `getMultiplier()` with a realistic relative value.

2. **`src/components/BenchmarkRunner.js`** — mirror the same entry in its local `configurations[]` array (this file is the frontend's copy).

3. **`src/utils/wasmLoader.js`** — if the config loads a WASM artifact, add a `case` for its `id` pointing to the artifact path.

4. **`BENCHMARKS_STATUS.md`** — add a row documenting real vs simulated status.

---

## Data Model

Each benchmark config flows through the app as:

```js
{
  id: 'wasm_rust',
  name: 'Rust (wasm-pack)',
  desc: 'LLVM/Rust Toolchain',
  color: '#dea584',
  compilation: { family, toolchain, backend, language, optLevel, flags, postProcess, status },
  tests: [                         // populated after running
    { name: 'Fibonacci (Base)', opsPerSec: 312000, stats: { mean, deviation, margin } },
    { name: 'Prime Check',      opsPerSec: 270000, stats: { ... } },
    ...
  ]
}
```

`benchmarkData` = `{ timestamp: ISO string, configurations: Config[] }` — passed as React state from `App.js` down through `BenchmarkRunner` and `HallwayVisualization`.

---

## Compilation Families

Configs are grouped into these families for chart views:

| family | configs |
|--------|---------|
| `js` | js_inline, js_external, js_bigint, js_terser, js_closure, js_esbuild, js_swc, js_tsc |
| `wasm` | js_wasm_std, wasm_rust, wasm_cheerp, wasm_as, wasm_simd, wasm_threads, wasm_openmp, wasm_max, wasm_emcc, wasm_javy |
| `gpu` | webgl_compute, webgpu_compute |

---

## Visualization Modes

`HallwayVisualization.js` controls which view is shown via `viewMode` state:

| mode | component | description |
|------|-----------|-------------|
| `'hallway'` | `Hallway3DView` | Immersive server rack, animated ops/sec bars |
| `'comparison'` | `CompilerComparisonView` | Analytical charts for compiler comparison |

Toggle buttons are rendered in the view controls header.

### CompilerComparisonView Chart Types

| Chart | What it shows |
|-------|--------------|
| **Grouped Bars** | ops/sec per test, one bar-group per test, colored bars per compiler |
| **Speedup** | All compilers normalized to `js_inline = 1.0×`, sorted descending |
| **Pipeline Waterfall** | AssemblyScript: Base → wasm-opt → WasmEdge AOT step gains |
| **Heatmap** | Compiler × test grid, color = % of best-in-column |

---

## Snapshot / Version Tracking

`src/utils/snapshotManager.js` provides:

```js
saveSnapshot(benchmarkData)     // persist to localStorage + optional JSON download
loadSnapshot()                  // retrieve from localStorage
diffSnapshots(baseline, current) // returns delta ops/sec and % change per config+test
```

Use **Save Results** / **Compare to Saved** buttons in BenchmarkRunner to track performance changes when compilers are upgraded or new configs are added.

---

## Real vs Simulated Benchmarks

See `BENCHMARKS_STATUS.md` for full detail. Summary:

| Config | Status | Notes |
|--------|--------|-------|
| wasm_rust | Real | Build with `npm run build:rust` |
| wasm_openmp / wasm_max | Real | Build with `npm run build:omp` |
| wasm_as (physics) | Real | Build with `npm run build:physics` |
| webgl_compute / webgpu_compute | Real (web only) | Requires browser with WebGL2/WebGPU |
| wasm_cheerp | Simulated | Needs Cheerp toolchain installed |
| js_* | Simulated (multipliers) | Pure JS, no build step needed |
| GPU (CLI) | Simulated | Node has no GPU context |

---

## Missing / Candidate Compilation Methods

These are not yet in the benchmark suite but are worth adding:

| id | Toolchain | Why |
|----|-----------|-----|
| `js_esbuild` | esbuild (Go) | Fastest bundler/minifier; used in Vite, widely replacing Terser |
| `js_swc` | SWC (Rust) | Rust-based JS/TS transpiler; default in Next.js 13+ |
| `js_tsc` | tsc (TypeScript) | Baseline TypeScript compiler output; contrast with tsgo |
| `wasm_emcc` | emcc (C scalar) | Pure C→WASM baseline without OpenMP/threads |
| `wasm_javy` | Javy/QuickJS | JS interpreted inside WASM — unique JS-in-WASM portability tradeoff |

---

## Common Pitfalls

- **BenchmarkRunner.js duplicates configs.js** — both must be kept in sync when adding new configs.
- **WASM 404s in browser**: `wasmLoader.js` pre-checks file existence; if artifacts aren't built you'll get a silent fallback to simulation.
- **SharedArrayBuffer (for threads)**: requires COOP/COEP headers — the dev server in `package.json` scripts sets these via `REACT_APP_*` env or a custom server wrapper.
- **WebGPU availability**: only Chrome/Edge 113+. The app checks `navigator.gpu` and disables the GPU button if unavailable.
- **Snapshot diffing**: the baseline snapshot is keyed by config `id` + test `name` — adding/renaming configs will break existing comparisons.
