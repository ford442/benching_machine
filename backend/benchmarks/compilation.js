const Benchmark = require('benchmark');

/**
 * Compilation Time Benchmark Module
 * Tests compilation and execution times for different code patterns
 */

class CompilationBenchmark {
  constructor() {
    this.suite = new Benchmark.Suite('Compilation');
    this.results = [];
  }

  /**
   * Dynamic function creation and execution
   */
  dynamicFunction(iterations) {
    for (let i = 0; i < iterations; i++) {
      const fn = new Function('x', 'return x * 2 + ' + i);
      fn(i);
    }
  }

  /**
   * Eval-based code execution
   * Note: eval() is used intentionally here for benchmarking purposes only
   * to measure the performance impact of dynamic code evaluation.
   * This is not recommended for production code.
   */
  evalExecution(iterations) {
    for (let i = 0; i < iterations; i++) {
      eval(`const result = ${i} * 2 + ${i};`);
    }
  }

  /**
   * Regular function execution (baseline)
   */
  regularFunction(iterations) {
    const fn = (x, y) => x * 2 + y;
    for (let i = 0; i < iterations; i++) {
      fn(i, i);
    }
  }

  /**
   * Arrow function vs regular function
   */
  arrowVsRegular(iterations) {
    const arrow = (x) => x * 2;
    function regular(x) { return x * 2; }
    
    for (let i = 0; i < iterations; i++) {
      arrow(i);
      regular(i);
    }
  }

  /**
   * Real WebAssembly compilation
   * Compiles a minimal WASM module synchronously
   */
  wasmCompilation() {
    // Minimal valid WASM binary (Magic + Version)
    const wasmCode = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      // Section 1 (Type): 1 type, func(i32, i32) -> i32
      0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
      // Section 3 (Function): 1 function, using type 0
      0x03, 0x02, 0x01, 0x00,
      // Section 7 (Export): "add" -> func 0
      0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
      // Section 10 (Code): 1 function body
      0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b
    ]);

    // Synchronous compilation (new WebAssembly.Module)
    // This measures the time to parse and compile the bytecode
    const module = new WebAssembly.Module(wasmCode);

    // Optional: Instantiate to verify (adds a tiny bit of overhead but ensures validity)
    const instance = new WebAssembly.Instance(module);
    
    // Check if the exported function works (validity check, negligible cost relative to compilation)
    if (instance.exports.add(1, 2) !== 3) {
      throw new Error('WASM compilation failed validity check');
    }
  }

  /**
   * Run all compilation benchmarks
   */
  async run() {
    return new Promise((resolve) => {
      this.suite
        .add('Regular Function (10k calls)', () => {
          this.regularFunction(10000);
        })
        .add('Arrow vs Regular (10k calls)', () => {
          this.arrowVsRegular(10000);
        })
        .add('Dynamic Function Creation (100 calls)', () => {
          this.dynamicFunction(100);
        })
        .add('WASM Compilation (Real)', () => {
          this.wasmCompilation();
        })
        .on('cycle', (event) => {
          const benchmark = event.target;
          this.results.push({
            name: benchmark.name,
            opsPerSec: benchmark.hz,
            stats: {
              mean: benchmark.stats.mean,
              deviation: benchmark.stats.deviation,
              margin: benchmark.stats.rme
            }
          });
        })
        .on('complete', () => {
          resolve(this.results);
        })
        .run({ async: true });
    });
  }

  getResults() {
    return this.results;
  }
}

module.exports = CompilationBenchmark;
