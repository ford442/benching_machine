# Physics Experiment (AssemblyScript)

This experiment builds a small physics toy using AssemblyScript and demonstrates post-processing via `wasm-opt` and WasmEdge AOT.

Build steps
----------

- Build with AssemblyScript (requires `asc`):

```bash
cd backend/experiments/physics
./build-asc.sh
```

- Optionally run `wasm-opt` (requires Binaryen):

```bash
./build-wasm-opt.sh
```

- Optionally produce WasmEdge AOT artifacts (requires `wasmedgec`):

```bash
./build-wasmedge-aot.sh
```

Outputs are placed in `public/benchmarks/physics/` as `candy_physics.wasm`, `candy_physics.wat`, and optional `.aot` file.

Notes
-----
- `--target wasm-gc` and `--enable reference-types` enable GC features; ensure the target runtime supports them, or remove those flags for broader compatibility.
- The scripts detect missing tools and skip gracefully.
