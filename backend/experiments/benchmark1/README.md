Benchmark 1: Command Buffer Bloat (PoC)
====================================

This experiment measures the CPU "tax" of encoding & submitting work to the browser GPU driver.

What it does
------------
- Compiles a WGSL compute shader that does heavy math work per invocation.
- Runs three scenarios:
  1. Minimal: dispatch(1,1,1) — GPU won't be saturated
  2. Balanced: dispatch(64,32,1) — reasonable occupancy
  3. Bloated: dispatch(2048,2048,1) — many workgroups
- Also runs a refinement: calls dispatch(1,1,1) 10,000 times to show the cost of many submissions.

Build
-----
You need Emscripten (emsdk) in your path and a browser with WebGPU enabled.

```bash
cd backend/experiments/benchmark1
chmod +x build.sh
./build.sh
```

Serve the `dist/` folder with the COOP/COEP headers to enable SharedArrayBuffer / threads when needed.

Example Netlify headers (if serving on a static host):

```
/experiments/benchmark1/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

Run & Expected Output
---------------------
Open the generated `dist/bloat_test.html` in a WebGPU-capable browser and look at the DevTools console. You should see output similar to:

```
--- BENCHMARK 1: COMMAND BUFFER BLOAT ---
[setup] Acquired device and queue.
Test [Minimal (1 group)]:
  Grid: (1x1) | Threads: 64
  Loops/Thread: 4194304
  CPU Dispatch Overhead: 0.12 ms
-----------------------------------
Test [Balanced]:
  Grid: (64x32) | Threads: 131072
  Loops/Thread: 2048
  CPU Dispatch Overhead: 0.6 ms
-----------------------------------
Test [Bloated (large grid)]:
  Grid: (2048x2048) | Threads: 268435456
  Loops/Thread: 1
  CPU Dispatch Overhead: 5.2 ms
-----------------------------------
Refinement: Repeated small dispatches (10000 dispatches of 1,1,1)
  Repeated dispatch overhead: 420.3 ms for 10000 dispatches
-----------------------------------
Benchmark complete.
```

Notes & Tips
-----------
- The measured CPU dispatch overhead depends heavily on browser and driver implementation. The absolute numbers are not important; the relative differences are.
- If you hit `navigator.gpu` undefined inside Workers or device request failures, consult browser flags and the console to determine whether WebGPU is available on that platform.

Next steps
----------
- Add variants that measure full round-trip (CPU encode + GPU execution time via timestamp queries).
- Compare the "bloat" effect across different browsers.
- Run with multiple smaller dispatches vs a single large dispatch to see which is more efficient in practice.

License: MIT
