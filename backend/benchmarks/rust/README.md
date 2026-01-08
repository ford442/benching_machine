# Rust Benchmark Module

This directory is reserved for Rust-based benchmarks that will be compiled to WebAssembly.

## Setup Instructions

1. Install Rust and wasm-pack:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   cargo install wasm-pack
   ```

2. Initialize a new Rust project:
   ```bash
   cargo init --lib
   ```

3. Add to `Cargo.toml`:
   ```toml
   [lib]
   crate-type = ["cdylib"]

   [dependencies]
   wasm-bindgen = "0.2"
   ```

4. Example Rust benchmark code for `src/lib.rs`:
   ```rust
   use wasm_bindgen::prelude::*;

   #[wasm_bindgen]
   pub fn fibonacci(n: i32) -> i32 {
       if n <= 1 {
           return n;
       }
       fibonacci(n - 1) + fibonacci(n - 2)
   }

   #[wasm_bindgen]
   pub fn matrix_multiply(size: usize) -> Vec<f64> {
       let mut a = vec![vec![1.0; size]; size];
       let mut b = vec![vec![2.0; size]; size];
       let mut result = vec![vec![0.0; size]; size];
       
       for i in 0..size {
           for j in 0..size {
               for k in 0..size {
                   result[i][j] += a[i][k] * b[k][j];
               }
           }
       }
       
       result.into_iter().flatten().collect()
   }
   ```

5. Build the WASM module:
   ```bash
   wasm-pack build --target web
   ```

6. The compiled WASM will be in the `pkg/` directory and can be imported in JavaScript.

## Integration

Once built, import the WASM module in your JavaScript benchmarks:

```javascript
import init, { fibonacci, matrix_multiply } from './rust_benchmark/pkg/rust_benchmark.js';

async function runRustBenchmarks() {
  await init();
  const result = fibonacci(20);
  console.log('Rust Fibonacci(20):', result);
}
```

## TODO

- [ ] Create Rust project structure
- [ ] Implement CPU-intensive benchmarks in Rust
- [ ] Implement memory benchmarks in Rust
- [ ] Build to WebAssembly
- [ ] Integrate with JavaScript benchmark runner
- [ ] Compare performance with pure JavaScript implementations
