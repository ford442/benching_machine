import React, { useState } from 'react';
import './BenchmarkRunner.css';

// Mock benchmark functions for the browser
const mockBenchmarks = {
  cpu: () => new Promise((resolve) => {
    setTimeout(() => resolve([
      { name: 'Fibonacci(20)', opsPerSec: 125000 + Math.random() * 25000, stats: { mean: 0.000008, deviation: 0.0000002, margin: 2.5 } },
      { name: 'Prime Check (10000 iterations)', opsPerSec: 85000 + Math.random() * 15000, stats: { mean: 0.000012, deviation: 0.0000003, margin: 3.1 } },
      { name: 'Matrix Multiply (10x10)', opsPerSec: 45000 + Math.random() * 10000, stats: { mean: 0.000022, deviation: 0.0000005, margin: 2.8 } }
    ]), 2000);
  }),
  memory: () => new Promise((resolve) => {
    setTimeout(() => resolve([
      { name: 'Array Operations (10k elements)', opsPerSec: 95000 + Math.random() * 20000, stats: { mean: 0.000011, deviation: 0.0000003, margin: 2.7 } },
      { name: 'Object Creation (1k objects)', opsPerSec: 65000 + Math.random() * 15000, stats: { mean: 0.000015, deviation: 0.0000004, margin: 3.2 } },
      { name: 'String Concatenation (1k iterations)', opsPerSec: 35000 + Math.random() * 10000, stats: { mean: 0.000029, deviation: 0.0000007, margin: 3.5 } },
      { name: 'Typed Array Operations (10k elements)', opsPerSec: 105000 + Math.random() * 25000, stats: { mean: 0.000009, deviation: 0.0000002, margin: 2.4 } }
    ]), 2500);
  }),
  compilation: () => new Promise((resolve) => {
    setTimeout(() => resolve([
      { name: 'Regular Function (10k calls)', opsPerSec: 155000 + Math.random() * 30000, stats: { mean: 0.000006, deviation: 0.0000001, margin: 2.1 } },
      { name: 'Arrow vs Regular (10k calls)', opsPerSec: 145000 + Math.random() * 28000, stats: { mean: 0.000007, deviation: 0.0000002, margin: 2.3 } },
      { name: 'Dynamic Function Creation (100 calls)', opsPerSec: 25000 + Math.random() * 8000, stats: { mean: 0.000040, deviation: 0.000001, margin: 4.2 } },
      { name: 'WASM Compilation Simulation', opsPerSec: 75000 + Math.random() * 18000, stats: { mean: 0.000013, deviation: 0.0000003, margin: 2.9 } }
    ]), 2000);
  })
};

function BenchmarkRunner({ setBenchmarkData, isRunning, setIsRunning }) {
  const [progress, setProgress] = useState('');

  const runBenchmarks = async () => {
    setIsRunning(true);
    setProgress('Starting benchmarks...');
    
    const results = {
      timestamp: new Date().toISOString(),
      benchmarks: {}
    };

    try {
      setProgress('Running CPU benchmarks...');
      results.benchmarks.cpu = await mockBenchmarks.cpu();
      
      setProgress('Running Memory benchmarks...');
      results.benchmarks.memory = await mockBenchmarks.memory();
      
      setProgress('Running Compilation benchmarks...');
      results.benchmarks.compilation = await mockBenchmarks.compilation();
      
      setBenchmarkData(results);
      setProgress('Benchmarks complete!');
    } catch (error) {
      setProgress('Error running benchmarks: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="benchmark-runner">
      <div className="runner-card">
        <h2>Benchmark Controls</h2>
        <button 
          className="run-button"
          onClick={runBenchmarks}
          disabled={isRunning}
        >
          {isRunning ? '⏳ Running...' : '▶ Run Benchmarks'}
        </button>
        {progress && (
          <div className="progress-status">
            {progress}
          </div>
        )}
        <div className="info-section">
          <h3>About</h3>
          <p>
            This tool compares performance across JavaScript, Rust, and WebAssembly.
            Click "Run Benchmarks" to see real-time results in the hallway visualization.
          </p>
          <div className="tech-stack">
            <span className="tech-badge">JavaScript</span>
            <span className="tech-badge">Rust</span>
            <span className="tech-badge">WebAssembly</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BenchmarkRunner;
