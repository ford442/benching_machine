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
- **WASM Rack (`webgpu_dispatch_wasm`)**: Simulated (ready for real Emscripten/Dawn build). Represents what happens when the same dispatch loop is compiled to C++ and driven through Emscripten's WebGPU C++ bindings — the glue overhead typically drops throughput by 3-5×.

**Key Lesson**: WASM is unbeatable for number-crunching, but for *API-heavy* GPU workloads (frequent small dispatches), staying in JS avoids the cross-boundary tax.

## 5. Known Limitations & Research Areas
- **Browser Limits**: Chrome typically limits active WebGL/WebGPU contexts (often ~16). A Swarm > 16 agents may fail.
- **Driver Overhead**: Does creating 4 Queues actually give 4x command throughput, or does the OS serialize them? (See *Benchmark 1: Command Buffer Bloat*).
