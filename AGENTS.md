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

## 4. Known Limitations & Research Areas
- **Browser Limits**: Chrome typically limits active WebGL/WebGPU contexts (often ~16). A Swarm > 16 agents may fail.
- **Driver Overhead**: Does creating 4 Queues actually give 4x command throughput, or does the OS serialize them? (See *Benchmark 1: Command Buffer Bloat*).
