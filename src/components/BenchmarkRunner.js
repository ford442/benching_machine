import React, { useState } from 'react';
import './BenchmarkRunner.css';

// 1. Define the "Machines" (Routes)
const configurations = [
  // --- A. Baseline Web ---
  { 
    id: 'js_inline', 
    name: 'Inline Script (HTML)', 
    desc: 'Standard JS embedded directly in HTML',
    color: '#f1e05a' 
  },
  { 
    id: 'js_wasm_std', 
    name: 'JS + WASM (Standard)', 
    desc: 'Vanilla JS loading standard WASM module',
    color: '#654ff0'
  },

  // --- B. JS Optimizers ---
  { 
    id: 'js_terser', 
    name: 'JS + Terser', 
    desc: 'Standard minification (Mangling/Compress)',
    color: '#fab1a0'
  },
  { 
    id: 'js_closure', 
    name: 'Google Closure (Adv)', 
    desc: 'Advanced optimizations & dead code removal',
    color: '#e17055'
  },
  { 
    id: 'js_roadroller', 
    name: 'JS + Roadroller', 
    desc: 'Heavy compression (Packer) for size',
    color: '#d63031'
  },

  // --- C. WASM Optimizers ---
  { 
    id: 'wasm_opt', 
    name: 'WASM + wasm-opt', 
    desc: 'Binaryen optimization passes (-O4)',
    color: '#0984e3'
  },
  { 
    id: 'wasmedge_aot', 
    name: 'WasmEdge AOT', 
    desc: 'Ahead-of-Time native compilation',
    color: '#00cec9'
  },
  { 
    id: 'wasm_asc', 
    name: 'AssemblyScript (asc)', 
    desc: 'AssemblyScript build (asc)',
    color: '#007acc'
  },
  { 
    id: 'wasm_asc_opt', 
    name: 'AssemblyScript + wasm-opt', 
    desc: 'asc + wasm-opt (Binaryen) O4',
    color: '#0984e3'
  },
  { 
    id: 'wasm_asc_aot', 
    name: 'AssemblyScript + WasmEdge AOT', 
    desc: 'AOT via WasmEdge',
    color: '#00cec9'
  }
];

// Helper to generate a result for a specific test
const generateResult = (baseScore, variance, name) => ({
  name,
  opsPerSec: baseScore + Math.random() * variance,
  stats: { mean: 0.00001, deviation: 0.000001, margin: 2.0 }
});

// Test descriptions used in the UI for detailed explanations
const testDetails = {
  'Fibonacci (Recursive)': {
    summary: 'Recursive Fibonacci to exercise call-stacks and integer math.',
    details: 'A deep recursive implementation which stresses CPU-bound integer arithmetic and function-call overhead. Good for showing differences in BigInt vs native integer performance.',
    tags: ['CPU']
  },
'Fibonacci (BigInt/i64)': {
    summary: 'BigInt in JS vs i64 in WASM.',
    details: 'Compares BigInt arithmetic (JS) against native 64-bit integer ops in WASM. BigInt often incurs additional overhead in JS engines.',
    tags: ['CPU','Integer']
  },
  'Matrix Multiply': {
    summary: 'Dense matrix multiply to measure FP throughput.',
    details: 'Small matrix multiplication (10x10) that tests floating point pipelines; benefits from SIMD and compiler optimizations.',
    tags: ['SIMD']
  },
  'Matrix Multiply (WASM Threads)': {
    summary: 'Threaded matrix multiply for parallel speedup.',
    details: 'Simulates a multithreaded implementation using WASM threads to split work across cores. Requires SharedArrayBuffer and COOP/COEP headers in the browser.',
    tags: ['SIMD','Threads']
  },
  'Matrix Multiply (OpenMP SIMD)': {
    summary: 'SIMD-optimized matrix multiply (OpenMP/C++).',
    details: 'Represents a vectorized implementation compiled with OpenMP/SIMD intrinsics; typical for native builds or compiler-optimized WASM.',
    tags: ['SIMD','OpenMP']
  },
  'Prime Check': {
    summary: 'Naive primality test to stress integer ops and branching.',
    details: 'Useful for evaluating integer performance and branch-heavy code. Not easily vectorized.',
    tags: ['CPU']
  },
  'Parse/Load Time (Inv)': {
    summary: 'Startup and load efficiency (higher is better).',
    details: 'Empirical measure of download/decompress/initialization overhead. Roadroller shows smaller download size but high decompression cost; AOT compilation shows near-instant startup.',
    tags: ['Startup','IO']
  },
  'Startup/Load Efficiency': {
    summary: 'Combined download/decompress/startup speed.',
    details: 'Higher is better; reflects how quickly a build becomes runnable in the browser or runtime.',
    tags: ['Startup','IO']
  }
};

// SVG icons for tags
const getTagIcon = (tag) => {
  const commonProps = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };
  switch (tag) {
    case 'SIMD':
      return (
        <svg {...commonProps} aria-hidden="true">
          <title>SIMD</title>
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" />
        </svg>
      );
    case 'Threads':
      return (
        <svg {...commonProps} aria-hidden="true">
          <title>Threads</title>
          <circle cx="7" cy="8" r="2" fill="currentColor" />
          <circle cx="12" cy="8" r="2" fill="currentColor" />
          <circle cx="17" cy="8" r="2" fill="currentColor" />
        </svg>
      );
    case 'IO':
      return (
        <svg {...commonProps} aria-hidden="true">
          <title>I/O</title>
          <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M7 12l5 5 5-5" fill="currentColor" />
        </svg>
      );
    case 'Startup':
      return (
        <svg {...commonProps} aria-hidden="true">
          <title>Startup</title>
          <path d="M12 2l2 6h-4l2-6zM6 10l6 12 6-12H6z" fill="currentColor" />
        </svg>
      );
    case 'CPU':
      return (
        <svg {...commonProps} aria-hidden="true">
          <title>CPU</title>
          <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" />
        </svg>
      );
    case 'Integer':
      return (
        <svg {...commonProps} aria-hidden="true">
          <title>Integer</title>
          <text x="4" y="16" fontSize="14" fill="currentColor" fontFamily="monospace">#</text>
        </svg>
      );
    case 'OpenMP':
      return (
        <svg {...commonProps} aria-hidden="true">
          <title>OpenMP</title>
          <path d="M12 2 L2 22h20L12 2z" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps} aria-hidden="true">
          <title>Tag</title>
          <circle cx="12" cy="12" r="8" fill="currentColor" />
        </svg>
      );
  }
};

// Mock Data Generator with Optimization logic
const mockRunConfig = (configId) => new Promise((resolve) => {
  let m = 1.0; // Performance Multiplier
  let loadScore = 150000; // "Load Speed" score (higher is better/faster)

  switch (configId) {
    // --- Baseline ---
    case 'js_inline':   m = 1.0; break;
    case 'js_wasm_std': m = 2.5; break;

    // --- JS Optimizers ---
    case 'js_terser': 
      m = 1.05; // Slightly faster parsing, runtime mostly same
      loadScore = 180000; // Smaller file = faster load
      break;
    case 'js_closure': 
      m = 1.4; // Advanced mode inlines functions, boosting runtime
      loadScore = 190000; // Very small file
      break;
    case 'js_roadroller': 
      m = 1.0; // Runtime is normal JS
      loadScore = 50000; // SLOW startup due to heavy decompression
      break;

    // --- WASM Optimizers ---
    case 'wasm_asc':
      m = 2.3; // AssemblyScript baseline
      loadScore = 160000;
      break;
    case 'wasm_asc_opt':
      m = 2.8; // asm + wasm-opt
      loadScore = 170000;
      break;
    case 'wasm_asc_aot':
      m = 4.5; // AOT similar to WasmEdge AOT
      loadScore = 200000;
      break;
    case 'wasm_opt': 
      m = 2.8; // Better instruction selection & ordering
      loadScore = 170000; // Smaller binary
      break;
    case 'wasmedge_aot': 
      m = 4.5; // Near-native speed (skips browser compilation tiers)
      loadScore = 200000; // Instant startup (already compiled)
      break;
      
    default: m = 1.0;
  }
  
  // Simulate async benchmark time
  setTimeout(() => resolve([
    generateResult(120000 * m, 20000, 'Fibonacci (Recursive)'),
    generateResult(45000 * m, 5000, 'Matrix Multiply'),
    generateResult(85000 * m, 10000, 'Prime Check'),
    generateResult(loadScore, 10000, 'Startup/Load Efficiency') 
  ]), 1000 + Math.random() * 500);
});

function BenchmarkRunner({ setBenchmarkData, isRunning, setIsRunning }) {
  const [progress, setProgress] = useState('');
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [expandedTest, setExpandedTest] = useState(null);

  const runBenchmarks = async () => {
    setIsRunning(true);
    
    const newResults = {
      timestamp: new Date().toISOString(),
      configurations: []
    };

    try {
      for (const config of configurations) {
        setProgress(`Profiling Build: ${config.name}...`);
        const results = await mockRunConfig(config.id);
        
        newResults.configurations.push({
          ...config,
          tests: results
        });
        
        setBenchmarkData({ ...newResults }); 
      }
      setProgress('Build optimization comparison complete!');
    } catch (error) {
      setProgress('Error: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="benchmark-runner">
      <div className="runner-card">
        <h2>Build Optimizer Battle</h2>
        <button 
          className="run-button"
          onClick={runBenchmarks}
          disabled={isRunning}
        >
          {isRunning ? '⏳ Profiling Builds...' : '▶ Compare Optimizers'}
        </button>
        
        {progress && <div className="progress-status">{progress}</div>}

        <div className="info-section">
          <h3>Optimization Strategies</h3>
          <p style={{fontSize: '0.9rem', opacity: 0.8, marginBottom: '15px'}}>
            Comparing minifiers, packers, and ahead-of-time compilers.
          </p>
          <div className="tech-stack-vertical">
            {configurations.map(c => (
              <div
                key={c.id}
                className={`tech-badge-row ${selectedConfigId === c.id ? 'selected' : ''}`}
                style={{borderLeft: `3px solid ${c.color}`}}
                onClick={() => setSelectedConfigId(c.id)}
              >
                <span className="badge-name">{c.name}</span>
                <span className="badge-desc">{c.desc}</span>
              </div>
            ))}
          </div>

          <div className="details-panel">
            <h4>Test Details</h4>
            <p style={{marginTop: 0}}>Click a route above to focus it, or expand any test to see its detailed explanation.</p>

            <div className="tests-list">
              {(selectedConfigId ? configurations.filter(cfg => cfg.id === selectedConfigId) : configurations).map(cfg => (
                <div key={cfg.id} className="config-tests">
                  <div className="config-header">
                    <strong style={{display: 'block'}}>{cfg.name}</strong>
                    <small style={{color: 'rgba(255,255,255,0.7)'}}>{cfg.desc}</small>
                  </div>

                  <div className="test-items">
                    {Object.keys(testDetails).map(testName => (
                      <div key={testName} className="test-item">
                        <div className="test-row">
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <div className="test-name" onClick={() => setExpandedTest(expandedTest === testName ? null : testName)}>{testName}</div>
                            <div className="test-badges">
                              {(testDetails[testName].tags || []).map(tag => (
                                <span key={tag} className={`tag-badge tag-${tag.toLowerCase()}`} title={tag} role="img" aria-label={tag}>
                                  {getTagIcon(tag)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="test-summary">{testDetails[testName].summary}</div>
                        </div>
                        {expandedTest === testName && (
                          <div className="test-desc">{testDetails[testName].details}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BenchmarkRunner;
