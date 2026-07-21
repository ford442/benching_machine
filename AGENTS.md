# AGENTS.md: The Swarm Architecture

## 1. The Core Concept
The "Swarm" represents a paradigm shift in browser-based computing. Instead of the traditional **Main Thread + Dumb Workers** model, we treat every WebAssembly thread as an **Autonomous Agent** with:
1.  **Exclusive Hardware Access**: Its own `wgpu::Device` and `wgpu::Queue`.
2.  **Private State**: Local memory for simulation/logic (no global locking).
3.  **Shared Communcation**: A "mailbox" system via `SharedArrayBuffer`.

## 2. Current Implementation (The PoC)
*See `backend/experiments/swarm`*

Currently, we have a "Spawning Phase" implemented:
- **Leader**: The Main Thread spawns $N$ pthreads.
- **Agents**: Each thread independently calls `wgpuInstanceRequestAdapter` -> `wgpuAdapterRequestDevice`.
- **Proof**: Logs confirm distinct Device pointers and successful async initialization in parallel.

## 3. The "Not-Yet-Implemented" Agent Capabilities

### A. The "Work Stealing" Pattern
**Goal**: Prevent the "slowest agent" problem where one complex frame holds up the visualizer.
- **Design**:
    - A global `std::atomic<int> work_queue_head` in Shared Memory.
    - Agents grab a batch of work (e.g., "Compute chunk 100-200") via `fetch_add`.
    - **Expansion**: Implement a Lock-Free Queue in C++ that both the Main Thread (Producer) and Agents (Consumers) can access.

### B. Inter-Agent Communication (The "Pheromones")
**Goal**: Allow agents to synchronize without blocking the Main Thread.
- **Design**:
    - Agents write status flags (Ready, Done, Error) to a specific offset in `SharedArrayBuffer`.
    - **Expansion**: Use `std::atomic::notify_all` (C++20) or futexes to wake up sleeping agents when new data arrives, rather than busy-waiting.

### C. The "Render Agent" vs. "Compute Agent"
**Goal**: Decoupling simulation from visualization.
- **Design**:
    - **Agents 1-3 (Compute)**: Run physics/AI, write positions to a Shared Buffer.
    - **Agent 4 (Render)**: The *only* agent that talks to the Canvas (via `OffscreenCanvas`). It reads the Shared Buffer and draws.
- **Expansion**: Modify `swarm.cpp` so that only Thread 0 requests a swap chain, while Threads 1-3 only request Compute capability.

## 4. Educational Benchmark: WebGPU Dispatch Overhead (JS vs WASM)
**Location**: `public/webgpu-benchmarks.js`, `public/gpu-benchmark-runner.js`, `src/components/BenchmarkRunner.js`

This benchmark measures *CPU-side* binding + command submission overhead, not shader execution time. It highlights a counter-intuitive truth in modern web GPU programming: **direct JavaScript can outperform WASM for WebGPU work** because Emscripten's glue layer adds JS↔WASM marshalling cost on every `queue.writeBuffer`, `createCommandEncoder`, and `submit` call.

- **JS Rack (`webgpu_dispatch`)**: Runs 5,000 frames of trivial compute, stressing the JS↔GPU binding layer directly. Returns dual metrics: "Dispatch Overhead (FPS)" and "Command Encoding Ops/Sec".
- **WASM Rack (`webgpu_dispatch_wasm`)**: Attempts to load a real Emscripten/Dawn C++ build, then falls back to simulation when the artifact is unavailable or WebGPU initialization fails. Represents what happens when the same dispatch loop is compiled to C++ and driven through Emscripten's WebGPU C++ bindings — the glue overhead typically drops throughput by 3-5×.

### Real Emscripten Implementation
**Location**: `backend/experiments/webgpu_wasm`, `src/utils/webgpuWasmBenchLoader.js`

Current status is experimental. The C++ implementation uses Emscripten WebGPU (`-s USE_WEBGPU=1`) and Dawn-style `wgpu::` APIs to run the same small generative compute workload as the JS rack: each frame writes a `time` uniform, creates a command encoder, dispatches 16 workgroups over a 1,024-float storage buffer, and submits the command buffer.

Build it with:

```bash
cd backend/experiments/webgpu_wasm
./build.sh
```

This produces:

```text
public/wasm/webgpu_bench.js
public/wasm/webgpu_bench.wasm
```

Known limitations:
- Device creation is asynchronous, so the React loader must wait for `isWebGPUDeviceReady()` before calling `runGenerativeShaderOverhead(5000)`.
- Emscripten's WebGPU support and Dawn wrapper surface are still moving targets; browser, Emscripten, and Chrome version differences can affect build success and runtime behavior.
- The benchmark intentionally measures CPU-side API traffic, not shader execution throughput. Most measured overhead is expected around `queue.WriteBuffer`, command encoder/pass creation, and `queue.Submit`.
- WebGPU may be unavailable on the user's browser/GPU, or the compiled artifacts may simply not exist in `public/wasm/`.

The simulated version remains as a fallback so the rack is still visible in demos, CI builds, and local checkouts where Emscripten is not installed or WebGPU is disabled. Treat simulated numbers as educational placeholders; treat real Emscripten numbers as experimental browser/runtime measurements.

**Key Lesson**: WASM is unbeatable for number-crunching, but for *API-heavy* GPU workloads (frequent small dispatches), staying in JS avoids the cross-boundary tax.

## 5. Known Limitations & Research Areas
- **Browser Limits**: Chrome typically limits active WebGL/WebGPU contexts (often ~16). A Swarm > 16 agents may fail.
- **Driver Overhead**: Does creating 4 Queues actually give 4x command throughput, or does the OS serialize them? (See *Benchmark 1: Command Buffer Bloat*).

## Cursor Cloud specific instructions

The update script (`npm install`) already installs Node dependencies on startup. This is a Node.js + React (Create React App / `react-scripts`) project. Standard run commands live in `README.md`, `docs/QUICKSTART.md`, `CLAUDE.md`, and `package.json` scripts — refer to those rather than duplicating.

Services (all run from repo root):
- **CLI benchmark runner** — `npm run bench` (e.g. `node backend/cli.js run --cpu`). Runs real Benchmark.js measurements; a full run takes tens of seconds.
- **Web UI** — `npm run web` (`react-scripts start`, port 3000). Set `BROWSER=none` when starting headless to avoid a browser-launch step.
- **Backend API** — `npm run serve` (`node backend/server.js`, port 4000). Endpoints: `GET /api/configurations`, `POST /api/run` with body `{ "configs": ["js_inline", ...] }`. Returns mocked-but-consistent results.

Non-obvious caveats:
- **No standalone lint script and no committed ESLint config.** Linting runs through `react-scripts` (CRA's built-in `eslint-config-react-app`); ESLint errors/warnings surface in the `npm run web` / `npm run build` output. There is no `npm run lint`.
- **No committed lockfile** (`package-lock.json` is gitignored), so `npm install` resolves fresh each time.
- **`express` is not listed in `package.json`** but `backend/server.js` uses it; it currently resolves as a transitive dependency, so `npm run serve` works after `npm install`.
- **`npm test` is a stub** (`echo "No tests yet"`); there is no automated test suite.
- **Do NOT click "▶ Run Full Suite" in the web UI as a smoke test.** The `wasm_as` ("AssemblyScript Suite") rack loads the real `public/benchmarks/physics/candy_physics.wasm` and runs recursive `fibonacci(35)` across large iteration counts on the browser main thread, which freezes/crashes the tab ("Page Unresponsive" → "Aw Snap"). For a quick, reliable UI smoke test use the **"💾 Load CPU Baseline"** / **"💾 Load GPU Baseline"** buttons (load recorded data from `public/baseline-benchmarks.json`) and/or the **"🎮 GPU Benchmarks"** button, then toggle the **"COMPILER CHARTS"** view.
- **WASM build scripts** (`build:physics`, `build:omp`, `build:rust`, `build:cheerp`, etc.) require external toolchains (Emscripten, Rust/wasm-pack, WasmEdge, Cheerp) that are NOT installed by the update script. They are experimental/optional; prebuilt artifacts already exist under `public/benchmarks/` and `public/wasm/`, so the app runs without rebuilding them.
- **WebGPU is typically unavailable** in this headless environment; the app detects this and falls back to simulated numbers (WebGPU racks may show "OFFLINE").
