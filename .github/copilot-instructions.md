# Copilot Instructions for Benching Machine

This file documents key information to help AI assistants work effectively in the Benching Machine repository.

## Project Overview

Benching Machine is a comprehensive benchmarking suite that compares **web compilation strategies** across JavaScript, Rust, and WebAssembly (WASM). The app has two modes:

- **CLI** — Node.js benchmark runner using Benchmark.js for CPU, Memory, Compilation, and simulated GPU benchmarks
- **Web UI** — React app with an immersive "hallway of server racks" visualization and compiler comparison charts

The project explores the question: **"Which compilation method wins which workload, and by how much?"**

## Build, Test, and Lint Commands

### Installation & Setup
```bash
npm install
```

### Running Benchmarks

**CLI mode** (all benchmarks):
```bash
npm run bench
npm start  # equivalent
```

**CLI mode** (specific categories):
```bash
npm run bench -- --cpu
npm run bench -- --memory
npm run bench -- --compilation
npm run bench -- --gpu
npm run bench -- --output results.json
```

**List available benchmarks**:
```bash
node backend/cli.js list
```

**Web UI** (port 3000):
```bash
npm run web
```

**Backend API server** (port 4000, optional):
```bash
npm run serve
```

### Building WASM and Native Targets

These build real (non-simulated) benchmark artifacts. See `BENCHMARKS_STATUS.md` for details on which are real vs mocked.

```bash
# Rust → WASM via wasm-pack
npm run build:rust

# C++ → WASM via Emscripten with OpenMP/Pthreads
npm run build:omp

# AssemblyScript → WASM via asc + wasm-opt + WasmEdge AOT
npm run build:physics

# C++ → WASM via Cheerp (requires Cheerp toolchain)
npm run build:cheerp

# Build all WASM targets
npm run build:all-wasm
```

### Testing

```bash
npm test
```

Note: Currently no test suite exists (placeholder only).

## High-Level Architecture

### Dual-Mode Design

**Backend (`/backend`)**:
- `cli.js` — CLI entry point using Commander.js
- `server.js` — Express API (optional, port 4000)
- `benchmarks/` — Modular benchmark implementations
  - `configs.js` — Master configuration registry + mock runner
  - `cpu.js` — CPU benchmarks (Fibonacci, Prime Check, Matrix Multiply)
  - `memory.js` — Memory benchmarks (Array ops, Object creation, Strings)
  - `compilation.js` — Compilation benchmarks using Benchmark.js
  - `gpu.js` — GPU benchmarks (CPU approximations in CLI mode)
- `experiments/` — Research/prototype code
  - `physics/` — AssemblyScript with wasm-opt and WasmEdge AOT pipeline
  - `swarm/` — Emscripten C++ with OpenMP/Pthreads for multi-threaded WASM

**Frontend (`/src`)**:
- `App.js` — React root component with state management
- `components/BenchmarkRunner.js` — Control panel that mirrors `configs.js` locally
- `components/HallwayVisualization.js` — View mode switcher
- `components/Hallway3DView.js` — Server rack visualization
- `components/CompilerComparisonView.js` — Analytical charts (bar, speedup, waterfall, heatmap)
- `utils/wasmLoader.js` — Dynamic WASM module loader
- `utils/snapshotManager.js` — Save/load/diff benchmark snapshots

**GPU Benchmarks (`/public`)**:
- `webgl-benchmarks.js` — WebGL fragment shader compute
- `webgpu-benchmarks.js` — WebGPU WGSL compute shaders
- `gpu-benchmark-runner.js` — GPU coordinator

### Data Flow

1. **Configuration Registry** — `backend/benchmarks/configs.js` defines all available compilation methods (JS, WASM, GPU).
2. **Frontend Mirroring** — `BenchmarkRunner.js` maintains a local copy of configs that must stay in sync.
3. **Backend Runner** — CLI executes configs via Benchmark.js and returns `{ timestamp, configurations: [...] }`.
4. **Frontend Runner** — React component queries either local mock data or the backend API.
5. **Visualization** — Results rendered in "hallway" view (3D server rack) or "comparison" view (analytical charts).

### Benchmark Config Model

```js
{
  id: 'wasm_rust',
  name: 'Rust (wasm-pack)',
  desc: 'LLVM/Rust Toolchain',
  color: '#dea584',
  compilation: {
    family: 'js' | 'wasm' | 'gpu',
    toolchain: 'rust' | 'emscripten' | 'cheerp' | etc,
    backend: 'LLVM' | 'Go' | 'C++' | etc,
    language: 'JavaScript' | 'Rust' | 'C++' | etc,
    optLevel: 'minify' | 'optimize' | 'simd' | etc,
    flags: [...],
    postProcess: [...],
    status: 'real' | 'simulated'
  },
  tests: [
    { name: 'Fibonacci (Base)', opsPerSec: 312000, stats: { mean, deviation, margin } },
    ...
  ]
}
```

### Compilation Families

Configs are grouped by family for chart views:

| Family | Configs |
|--------|---------|
| `js` | js_inline, js_external, js_bigint, js_terser, js_closure, js_esbuild, js_swc, js_tsc |
| `wasm` | js_wasm_std, wasm_rust, wasm_cheerp, wasm_as, wasm_simd, wasm_threads, wasm_openmp, wasm_max, wasm_emcc, wasm_javy |
| `gpu` | webgl_compute, webgpu_compute |

## Key Conventions

### Adding a New Compilation Config

When adding a new compilation method, keep these files in sync:

1. **`backend/benchmarks/configs.js`** — Add entry to `configurations[]` array with all metadata and add a case to `getMultiplier()` for realistic relative performance.

2. **`src/components/BenchmarkRunner.js`** — Add matching entry to its local `configurations[]` array (this is the frontend's copy).

3. **`src/utils/wasmLoader.js`** — If the config loads a WASM artifact, add a `case` for its `id` pointing to the artifact path.

4. **`BENCHMARKS_STATUS.md`** — Document real vs simulated status.

### Real vs Simulated Benchmarks

The suite supports both:
- **Real** — Actual compiled artifacts (Rust/WASM built with `npm run build:*`)
- **Simulated** — Mock data using relative performance multipliers

See `BENCHMARKS_STATUS.md` for the current status of each config.

### Snapshot and Versioning

Use `src/utils/snapshotManager.js` for performance tracking:
- Snapshots are keyed by config `id` + test `name`
- Adding/renaming configs breaks existing comparisons
- The web UI provides **Save Results** and **Compare to Saved** buttons

### GPU Benchmarks

- **Browser** — WebGL2 and WebGPU work with real shader compute
- **CLI** — GPU benchmarks use CPU approximations (no GPU context in Node.js)
- **Browser Detection** — The app checks `navigator.gpu` for WebGPU availability

### SharedArrayBuffer Headers

Threads/Worker support requires Cross-Origin-Opener-Policy (COOP) and Cross-Origin-Embedder-Policy (COEP) headers. The dev server is already configured via `react-scripts`.

## Toolchain Prerequisites

For building real WASM benchmarks, these optional tools may be needed:

| Tool | Used By | Install |
|------|---------|---------|
| Rust + Cargo | wasm_rust | https://rustup.rs |
| wasm-pack | wasm_rust | `npm install -g wasm-pack` |
| Emscripten (emcc) | wasm_openmp, wasm_max, wasm_emcc | https://emscripten.org/docs/getting_started/downloads.html |
| AssemblyScript (asc) | wasm_as | `npm install -g assemblyscript` |
| wasm-opt | wasm_as (optimization) | `npm install -g binaryen` |
| WasmEdge | wasm_as (AOT) | https://wasmedge.org/docs/start/install |
| Cheerp | wasm_cheerp | https://leaningtech.com/cheerp/ |
| Node.js ≥ 18 | all | https://nodejs.org |

## Common Pitfalls

- **Config Duplication** — `BenchmarkRunner.js` and `configs.js` must be kept in sync. Adding a config to one without the other causes silent failures.
- **WASM 404s** — If WASM artifacts aren't built, `wasmLoader.js` silently falls back to simulation. Check `BENCHMARKS_STATUS.md` if results seem wrong.
- **Snapshot Keying** — Snapshots use config `id` + test `name` as keys. Renaming either breaks diffs.
- **WebGPU Availability** — Only Chrome/Edge 113+. The web UI disables the GPU button gracefully if unavailable.
- **GPU in CLI** — Node.js has no GPU context, so CLI GPU benchmarks are simulated only.

## Recommended MCP Servers

These Model Context Protocol servers enhance Copilot's capabilities for this project:

### Playwright MCP
**Use Case**: Automate browser testing of the web UI visualization, benchmark runs, and GPU feature detection.

**Setup** (if using Cursor or Claude Desktop):
```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-playwright"]
  }
}
```

**Useful for**:
- Testing the hallway visualization rendering
- Automating benchmark runner UI interactions
- Verifying WebGL/WebGPU detection works correctly
- Visual regression testing

### GitHub MCP
**Use Case**: Query issues, PRs, and repository context to understand feature requests and blockers.

Enables Copilot to search benchmarking-related issues and track compilation method additions.

## References

For more details, see:
- `CLAUDE.md` — Detailed developer guide with data models and architecture
- `AGENTS.md` — "Swarm" multi-threaded WASM architecture (experimental)
- `BENCHMARKS_STATUS.md` — Real vs simulated status per benchmark
- `ARCHITECTURE.md` — System design overview
- `QUICKSTART.md` — 2-minute setup guide
