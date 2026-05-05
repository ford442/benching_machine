# Implementation Plan

## Phase 1: The "Wiring" (Connecting Backend to Frontend)
*Current Status: Backend C++ files exist, but React uses mock data.*

- [ ] **Step 1: Universal Build System**
    - Create a single `Makefile` or `build.js` at the root that compiles:
        - `experiments/swarm/swarm.cpp` -> `public/wasm/swarm.wasm`
        - `experiments/benchmark1/bloat_test.cpp` -> `public/wasm/bloat.wasm`
        - `experiments/benchmark4/upload.cpp` -> `public/wasm/upload.wasm`
    - Ensure artifacts are placed in `public/` so React can fetch them.

- [ ] **Step 2: The WASM Runner Component**
    - Create `src/components/WasmRunner.js`.
    - It should:
        1. Fetch the `.wasm` / `.js` glue code.
        2. Capture `stdout` from the Emscripten module.
        3. Parse specific "RESULT:" lines (e.g., `RESULT: 1200 ops/sec`).
        4. Pass these parsed numbers to `BenchmarkRunner` state.

- [ ] **Step 3: Enable "Real Mode" in UI**
    - Add a toggle in `BenchmarkRunner.js`: "Mode: Simulation (Mock) | Real (WASM)".
    - When "Real" is selected, disable `mockRunConfig` and trigger `WasmRunner`.

## Phase 2: Expanding the Experiments

- [ ] **Integrate Benchmark 1 (Bloat)**
    - **Task**: Modify `bloat_test.cpp` to accept parameters (grid size) from JavaScript.
    - **Goal**: Allow the React UI sliders to control the C++ `dispatch(x,y,z)` arguments dynamically.
    - **Tech**: Use `emscripten::val` or `EMSCRIPTEN_BINDINGS` to expose C++ functions to JS.

- [ ] **Integrate Benchmark 4 (Upload)**
    - **Task**: Visualizing the "Stutter".
    - **Goal**: In the React "Hallway", add a "Frame Time Graph" that spikes when the C++ upload blocks the main thread.
    - **Expansion**: Have the C++ thread report "Upload Start" and "Upload End" timestamps back to JS via `postMessage`.

## Phase 3: The 3D Upgrade

- [ ] **Three.js Integration**
    - Replace `HallwayVisualization.js` (Canvas 2D) with a React Three Fiber scene.
    - **Why?** To verify if running heavy WASM/WebGPU threads slows down the *Main Thread's* ability to render 3D frames.

- [ ] **The "Live Rack"**
    - Instead of just a bar chart, render the actual activity of the "Swarm" agents as blinking lights on the 3D server rack models.
    - **Data Flow**: C++ Agent -> SharedArrayBuffer -> JS Main Loop -> Three.js Instance Mesh color update.

## Phase 4: Hardware Comparison (Rust vs C++)

- [ ] **Implement the Rust Stubs**
    - Fill in `backend/benchmarks/rust/lib.rs` with the same logic as `bloat_test.cpp`.
    - Compare `wasm-bindgen` (Rust) overhead vs `emscripten` (C++) overhead for GPU dispatching.
