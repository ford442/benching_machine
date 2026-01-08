const Benchmark = require('benchmark');

/**
 * CPU Benchmark Module
 * Tests CPU-intensive operations like mathematical computations
 */

class CPUBenchmark {
  constructor() {
    this.suite = new Benchmark.Suite('CPU');
    this.results = [];
  }

  /**
   * Fibonacci calculation (recursive) - CPU intensive
   */
  fibonacci(n) {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }

  /**
   * Prime number calculation
   */
  isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    
    for (let i = 5; i * i <= num; i += 6) {
      if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
  }

  /**
   * Matrix multiplication
   */
  matrixMultiply(a, b) {
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  /**
   * Run all CPU benchmarks
   */
  async run() {
    return new Promise((resolve) => {
      this.suite
        .add('Fibonacci(20)', () => {
          this.fibonacci(20);
        })
        .add('Prime Check (10000 iterations)', () => {
          for (let i = 0; i < 10000; i++) {
            this.isPrime(i);
          }
        })
        .add('Matrix Multiply (10x10)', () => {
          const matrix1 = Array(10).fill().map(() => Array(10).fill(Math.random()));
          const matrix2 = Array(10).fill().map(() => Array(10).fill(Math.random()));
          this.matrixMultiply(matrix1, matrix2);
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

module.exports = CPUBenchmark;
