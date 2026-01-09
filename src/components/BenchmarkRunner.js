import React, { useState } from 'react';
import './BenchmarkRunner.css';

// 1. Define the "Machines" (Routes)
// Ordered logically: Baseline -> Standard Opt -> Compiler/Toolchain -> Hardware Features -> Custom/Experimental
const configurations = [
  // --- Baseline Web ---
  {
    id: 'js_inline',
    name: 'Inline Script (HTML)',
    desc: 'Standard JS embedded directly in HTML',
    color: '#f1e05a' // JS Yellow
  },
  {
    id: 'js_external',
    name: 'External .js File',
    desc: 'Standard JS loaded from external file',
    color: '#f0db4f' // JS Yellow (slightly different)
  },

  // --- Standard Performance ---
  {
    id: 'js_wasm_std',
    name: 'JS + WASM (Standard)',
    desc: 'Vanilla JS loading standard WASM module',
    color: '#654ff0' // WASM Purple
  },

  // --- Data Type Architectures ---
  {
    id: 'js_bigint',
    name: 'JS BigInt Math',
    desc: 'Pure JS using BigInt primitives',
    color: '#f7df1e' // JS Yellow
  },
  {
    id: 'wasm_i64',
    name: 'WASM i64 (Native)',
    desc: 'WASM native 64-bit integer ops',
    color: '#654ff0' // WASM Purple
  },

  // --- Compiler Showdown ---
  {
    id: 'wasm_rust',
    name: 'Rust (wasm-pack)',
    desc: 'Rust compiled via LLVM',
    color: '#dea584' // Rust Brown/Orange
  },
  {
    id: 'wasm_cheerp',
    name: 'Cheerp (C++)',
    desc: 'C++ compiled via Cheerp',
    color: '#d63031' // C++ Red-ish
  },
  {
    id: 'wasm_as',
    name: 'AssemblyScript',
    desc: 'TypeScript-like syntax to WASM',
    color: '#007acc' // TypeScript Blue
  },

  // --- Hardware Acceleration ---
  {
    id: 'wasm_simd',
    name: 'WASM + SIMD128',
    desc: 'Parallel vector operations enabled',
    color: '#2ecc71' // Green for "Go Fast"
  },
  {
    id: 'wasm_threads',
    name: 'WASM + Threads',
    desc: 'Multithreaded via SharedArrayBuffer',
    color: '#e84393' // Pink/Magenta for complexity
  },
  {
    id: 'wasm_max',
    name: 'WASM Max (OMP+SIMD)',
    desc: 'OpenMP Threads + SIMD128 Vectorization',
    color: '#ff0000' // Red/Gold
  },
  {
    id: 'webgpu_compute',
    name: 'WebGPU Compute',
    desc: 'Massive parallel float operations',
    color: '#00c853' // GPU Green
  },

  // --- Your Custom Architecture ---
  {
    id: 'utf16_1ijs',
    name: 'UTF-16 1ijs + WASM',
    desc: 'Custom 1ijs format with WASM payload',
    color: '#e05a33' // Custom Red/Orange
  },
  {
    id: 'utf16_html',
    name: 'UTF-16 HTML Loader',
    desc: 'Full UTF-16 HTML document loading 1ijs',
    color: '#c0392b' // Darker Custom Red
  }
];

// Helper to generate a result for a specific test
const generateResult = (baseScore, variance, name) => ({
  name,
  opsPerSec: baseScore + Math.random() * variance,
  stats: { mean: 0.00001, deviation: 0.000001, margin: 2.0 }
});

// Mock Data Generator
// This simulates the likely characteristics of each route
const mockRunConfig = (configId) => new Promise((resolve) => {
  // Simulation Logic:
  // - Inline/External JS: Baseline speed
  // - WASM: Significant speedup for math
  // - WebGPU: Massive speedup for Matrix, penalty for serial tasks

  let m = 1.0; // Multiplier
  let startupDelay = 0;

  switch (configId) {
    case 'js_inline': m = 1.0; break;
    case 'js_external': m = 1.05; break;
    case 'js_wasm_std': m = 2.5; break;
    case 'js_bigint': m = 0.8; break;
    case 'wasm_i64': m = 2.8; break;
    case 'wasm_rust': m = 2.5; break;
    case 'wasm_cheerp': m = 2.45; break;
    case 'wasm_as': m = 2.3; break;
    case 'wasm_simd': m = 3.5; break;
    case 'wasm_threads': m = 4.0; break;
    case 'wasm_max': m = 5.5; break; // Highest Multiplier (CPU)
    case 'webgpu_compute':
      m = 20.0; // Huge throughput potential
      startupDelay = 800; // Initialization overhead
      break;
    case 'utf16_1ijs':
      m = 2.6;
      startupDelay = 50;
      break;
    case 'utf16_html':
      m = 2.7;
      startupDelay = 100;
      break;
    default: m = 1.0;
  }
  
  const supportsWasmThreads = ['js_wasm_std', 'utf16_1ijs', 'utf16_html', 'wasm_threads', 'wasm_simd', 'wasm_rust', 'wasm_as', 'wasm_cheerp', 'wasm_max'].includes(configId);
  const supportsOpenMP = ['utf16_1ijs', 'utf16_html', 'wasm_rust', 'wasm_cheerp', 'wasm_max'].includes(configId);
  const isWebGpu = configId === 'webgpu_compute';

  setTimeout(() => resolve([
    // GPU is terrible at recursion/serial logic, penalize it heavily
    generateResult(120000 * (isWebGpu ? 0.1 : m), 20000, 'Fibonacci (Recursive)'),

    // GPU is okay at simple math, but overhead dominates small tasks
    generateResult(90000 * m * (configId === 'js_bigint' ? 0.6 : (isWebGpu ? 0.2 : 1)), 15000, 'Fibonacci (BigInt/i64)'),

    // The main event: GPU destroys CPU at Matrix Multiply
    generateResult(45000 * (isWebGpu ? m * 5 : m), 5000, 'Matrix Multiply'),

    // Comparisons
    generateResult(45000 * (m * (supportsWasmThreads ? 1.8 : 0.5)), 8000, 'Matrix Multiply (WASM Threads)'),
    generateResult(60000 * (supportsOpenMP ? (m * 2.2) : (m * 0.4)), 10000, 'Matrix Multiply (OpenMP SIMD)'),

    generateResult(85000 * (isWebGpu ? m * 0.5 : m), 10000, 'Prime Check'),
    generateResult(200000 * (m * 0.5), 30000, 'Parse/Load Time (Inv)')
  ]), 1500 + startupDelay + Math.random() * 1000);
});

// Helper to calculate total score for sorting
const calculateScore = (config) => {
  if (!config.tests || config.tests.length === 0) return 0;
  return config.tests.reduce((acc, test) => acc + test.opsPerSec, 0);
};

function BenchmarkRunner({ setBenchmarkData, isRunning, setIsRunning }) {
  const [progress, setProgress] = useState('');

  // Local state for displaying sorted results
  const [displayConfigs, setDisplayConfigs] = useState(configurations);

  const runBenchmarks = async () => {
    const useBackend = process.env.REACT_APP_USE_BACKEND === 'true';
    const apiBase = process.env.REACT_APP_BENCH_API || 'http://localhost:4000';

    setIsRunning(true);
    setProgress('Initializing configurations...');

    // Initial state: reset tests
    let currentResults = configurations.map(c => ({ ...c, tests: [] }));

    // Sort helper
    const updateAndSort = (list) => {
        const sorted = [...list].sort((a, b) => calculateScore(b) - calculateScore(a));
        setDisplayConfigs(sorted);
        setBenchmarkData({ timestamp: new Date().toISOString(), configurations: sorted });
    };

    // Render initial state
    updateAndSort(currentResults);

    if (useBackend) {
      try {
        setProgress('Dispatching configs to backend...');
        const resp = await fetch(`${apiBase}/api/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configs: configurations.map(c => c.id) })
        });
        if (!resp.ok) throw new Error('Backend error: ' + resp.statusText);
        const results = await resp.json();

        // Backend results need to be sorted locally for display
        updateAndSort(results.configurations);

        setProgress('All benchmarking routes complete (backend).');
      } catch (error) {
        setProgress('Error: ' + error.message);
      } finally {
        setIsRunning(false);
      }

      return;
    }

    // Fallback to client-side mock runs (Race Mode)
    try {
      for (const config of configurations) {
        setProgress(`Benchmarking Route: ${config.name}...`);
        const results = await mockRunConfig(config.id);

        // Update result in local tracking array
        const idx = currentResults.findIndex(c => c.id === config.id);
        if (idx !== -1) {
            currentResults[idx] = { ...currentResults[idx], tests: results };
        }

        // Update UI (Leaderboard)
        updateAndSort(currentResults);
      }

      setProgress('Race complete! Racks sorted by total performance.');
    } catch (error) {
      setProgress('Error: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="benchmark-runner">
      <div className="runner-card">
        <h2>Performance Race</h2>
        <button 
          className="run-button"
          onClick={runBenchmarks}
          disabled={isRunning}
        >
          {isRunning ? '⏳ Racing...' : '▶ Start Race'}
        </button>
        
        {progress && (
          <div className="progress-status">
            {progress}
          </div>
        )}

        <div className="info-section">
          <h3>Leaderboard</h3>
          <p style={{fontSize: '0.9rem', opacity: 0.8, marginBottom: '15px'}}>
            Racks will automatically rearrange themselves based on total operations per second.
          </p>
          <div className="tech-stack-vertical">
            {displayConfigs.map(c => (
              <div key={c.id} className="tech-badge-row" style={{borderLeft: `3px solid ${c.color}`}}>
                <span className="badge-name">{c.name}</span>
                <span className="badge-desc">{c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BenchmarkRunner;
