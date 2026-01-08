Benchmark 4: Upload Strategy Shootout (PoC)
=========================================

Goal
----
Compare serial uploads vs a pipelined Worker-Proxy double-buffer pattern where compute (producer) runs in parallel with GPU uploads (consumer). This PoC simulates heavy math on the CPU and measures upload times and total throughput.

Files
-----
- `upload_benchmark.cpp` — C++ PoC implementing a serial run and a pipelined double-buffer run.
- `build.sh` — Emscripten build script with OpenMP/pthread flags.

Build
-----
Requirements: emsdk/emscripten on PATH.

```bash
cd backend/experiments/benchmark4
chmod +x build.sh
./build.sh
```

Serve
-----
Serve the `dist/` folder with COOP/COEP headers if you want threads to be fully supported in the browser.

Netlify `_headers` example:

```
/experiments/benchmark4/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

Expected Output
---------------
- The serial run prints per-frame upload times and a total time.
- The pipelined run prints uploader-specific upload times and a total time which should be close to the max(compute, upload) if pipelining is effective.
- This PoC now compares both `writeBuffer` (direct queue writes) and a staging-buffer path (map + copyBufferToBuffer) and attempts to measure GPU completion times using `wgpuQueueOnSubmittedWorkDone` callbacks. The staging path measures map/unmap time and GPU completion time.

Notes
-----
- This PoC uses simple multithreading (std::thread) to emulate compute parallelism; for truly realistic CPU saturation you can switch to OpenMP (add `#pragma omp parallel for`) and adjust `PTHREAD_POOL_SIZE` accordingly in the build script.
- Upload times depend heavily on the browser's WebGPU implementation and whether the browser optimizes writeBuffer to do zero-copy or uses intermediate copies.

Next steps
----------
- Add a variation where uploads are done via staging buffers + copyBufferToBuffer and measure differences.
- Add measurement of actual GPU execution time via timestamp queries (if supported).

License: MIT
