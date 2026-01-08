const Benchmark = require('benchmark');

/**
 * Memory Benchmark Module
 * Tests memory allocation, access patterns, and garbage collection pressure
 */

class MemoryBenchmark {
  constructor() {
    this.suite = new Benchmark.Suite('Memory');
    this.results = [];
  }

  /**
   * Array allocation and manipulation
   */
  arrayOperations(size) {
    const arr = new Array(size);
    for (let i = 0; i < size; i++) {
      arr[i] = Math.random();
    }
    return arr.reduce((a, b) => a + b, 0);
  }

  /**
   * Object creation and property access
   */
  objectOperations(count) {
    const objects = [];
    for (let i = 0; i < count; i++) {
      objects.push({
        id: i,
        name: `Object ${i}`,
        data: new Array(10).fill(i),
        timestamp: Date.now()
      });
    }
    return objects.map(obj => obj.data.length).reduce((a, b) => a + b, 0);
  }

  /**
   * String concatenation (memory pressure)
   */
  stringOperations(iterations) {
    let str = '';
    for (let i = 0; i < iterations; i++) {
      str += `Iteration ${i} `;
    }
    return str.length;
  }

  /**
   * Typed array operations
   */
  typedArrayOperations(size) {
    const buffer = new ArrayBuffer(size * 4);
    const view = new Float32Array(buffer);
    for (let i = 0; i < size; i++) {
      view[i] = Math.random();
    }
    let sum = 0;
    for (let i = 0; i < size; i++) {
      sum += view[i];
    }
    return sum;
  }

  /**
   * Get memory usage (Node.js only)
   */
  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  }

  /**
   * Run all memory benchmarks
   */
  async run() {
    return new Promise((resolve) => {
      const initialMemory = this.getMemoryUsage();

      this.suite
        .add('Array Operations (10k elements)', () => {
          this.arrayOperations(10000);
        })
        .add('Object Creation (1k objects)', () => {
          this.objectOperations(1000);
        })
        .add('String Concatenation (1k iterations)', () => {
          this.stringOperations(1000);
        })
        .add('Typed Array Operations (10k elements)', () => {
          this.typedArrayOperations(10000);
        })
        .on('cycle', (event) => {
          const benchmark = event.target;
          const currentMemory = this.getMemoryUsage();
          
          this.results.push({
            name: benchmark.name,
            opsPerSec: benchmark.hz,
            stats: {
              mean: benchmark.stats.mean,
              deviation: benchmark.stats.deviation,
              margin: benchmark.stats.rme
            },
            memory: currentMemory ? {
              heapUsed: currentMemory.heapUsed,
              heapTotal: currentMemory.heapTotal,
              external: currentMemory.external
            } : null
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

module.exports = MemoryBenchmark;
