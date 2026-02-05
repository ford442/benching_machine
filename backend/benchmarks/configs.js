// backend/benchmarks/configs.js

const configurations = [
  // --- A. Baseline Web ---
  { id: 'js_inline', name: 'Inline Script', desc: 'Standard JS (HTML)', color: '#f1e05a' },
  { id: 'js_external', name: 'External File', desc: 'Standard JS (.js)', color: '#f0db4f' },
  { id: 'js_wasm_std', name: 'JS + WASM', desc: 'Vanilla WASM Loading', color: '#654ff0' },

  // --- B. JS Optimizers ---
  { id: 'js_terser', name: 'JS + Terser', desc: 'Minified & Mangled', color: '#fab1a0' },
  { id: 'js_closure', name: 'Closure Compiler', desc: 'Advanced Optimization', color: '#e17055' },

  // --- C. Data & Compilers ---
  { id: 'js_bigint', name: 'JS BigInt', desc: '64-bit Integer Math', color: '#f7df1e' },
  { id: 'wasm_rust', name: 'Rust (wasm-pack)', desc: 'LLVM/Rust Toolchain', color: '#dea584' },
  { id: 'wasm_cheerp', name: 'Cheerp (C++)', desc: 'C++ Toolchain', color: '#d63031' },
  
  // MERGED: AssemblyScript Suite
  { id: 'wasm_as', name: 'AssemblyScript Suite', desc: 'Base vs Optimized vs AOT', color: '#007acc' },

  // --- E. Hardware Acceleration ---
  { id: 'wasm_simd', name: 'WASM + SIMD', desc: 'Vector Operations', color: '#2ecc71' },
  { id: 'wasm_threads', name: 'WASM + Threads', desc: 'SharedArrayBuffer', color: '#e84393' },

  { id: 'wasm_openmp', name: 'WASM + OpenMP', desc: 'OMP Runtime + libomp', color: '#ff4757' },
  { id: 'wasm_max', name: 'WASM Max', desc: 'Threads + SIMD (No OMP)', color: '#ff0000' },

  // --- F. GPU Compute ---
  { id: 'webgl_compute', name: 'WebGL Compute', desc: 'Fragment Shader Compute', color: '#00d4ff' },
  { id: 'webgpu_compute', name: 'WebGPU Compute', desc: 'WGSL Compute Shaders', color: '#8e44ad' },
];

const generateResult = (baseScore, variance, name) => ({
  name,
  opsPerSec: Math.round(baseScore + Math.random() * variance),
  stats: { mean: baseScore ? baseScore / 1000000 : 0, deviation: variance / 1000000, margin: 2 }
});

function getMultiplier(configId) {
  switch (configId) {
    case 'js_inline': return 1.0;
    case 'js_external': return 1.05;
    case 'js_wasm_std': return 2.5;
    case 'js_terser': return 1.05;
    case 'js_closure': return 1.4;
    case 'js_bigint': return 0.8;
    case 'wasm_rust': return 2.5;
    case 'wasm_cheerp': return 2.45;
    case 'wasm_as': return 2.3;
    case 'wasm_simd': return 3.5;
    case 'wasm_threads': return 4.0;
    case 'wasm_openmp': return 4.3;
    case 'wasm_max': return 5.5;

    // GPU: Huge multiplier for supported tasks
    case 'webgl_compute': return 15.0;
    case 'webgpu_compute': return 25.0;

    default: return 1.0;
  }
}

async function runConfig(configId) {
  const m = getMultiplier(configId);
  const supportsWasmThreads = ['wasm_threads','wasm_simd','wasm_max'].includes(configId);
  const supportsOpenMP = ['wasm_openmp', 'wasm_max'].includes(configId);
  const isGPU = ['webgl_compute', 'webgpu_compute'].includes(configId);

  // Load Score Simulation
  let loadScore = 150000;
  if (configId === 'js_closure') loadScore = 190000;
  if (configId === 'webgl_compute') loadScore = 100000; // Shader compilation
  if (configId === 'webgpu_compute') loadScore = 80000; // Slow shader compilation

  // Simulate runtime latency
  await new Promise(r => setTimeout(r, 800 + Math.random() * 800));

  let results = [];

  // 1. Standard Fallback Tests
  if (!isGPU) {
      results.push(generateResult(120000 * m, 20000, 'Fibonacci (Base)'));
      results.push(generateResult(85000 * m, 10000, 'Prime Check'));
  }

  // 2. Optimized "Bars" for AssemblyScript Suite
  if (configId === 'wasm_as') {
      results.push(generateResult(120000 * m * 1.3, 20000, 'Fibonacci (wasm-opt)'));
      results.push(generateResult(120000 * m * 2.5, 20000, 'Fibonacci (WasmEdge AOT)'));
  }

  // 3. Matrix Multiplications
  // GPU excels here; CPU falls back
  if (isGPU) {
      if (configId === 'webgpu_compute') {
          results.push(generateResult(500000, 10000, 'Matrix Mult (Naive Global)'));
          results.push(generateResult(2500000, 50000, 'Matrix Mult (Tiled Shared)'));
      } else {
          // WebGL
          results.push(generateResult(45000 * 20.0, 5000, 'Matrix Mult (WebGL)'));
      }
  } else {
      results.push(generateResult(45000 * (m * (supportsWasmThreads ? 1.8 : 0.5)), 8000, 'Matrix Mult (WASM Threads)'));
      results.push(generateResult(60000 * (supportsOpenMP ? (m * 2.2) : (m * 0.4)), 10000, 'Matrix Mult (OpenMP SIMD)'));
  }

  // 4. Physics Simulation (Consistent with Frontend)
  if (supportsOpenMP || supportsWasmThreads || isGPU) {
      let physScore = 60000;
      if (isGPU) physScore = 150000;
      if (configId === 'wasm_max') physScore = 180000;
      results.push(generateResult(physScore, 10000, 'Physics Simulation'));
  }

  results.push(generateResult(loadScore, 10000, 'Startup/Load Efficiency'));

  return results;
}

async function runConfigsSequential(configIds) {
  const result = { timestamp: new Date().toISOString(), configurations: [] };
  for (const id of configIds) {
    const cfg = configurations.find(c => c.id === id) || { id, name: id }; 
    const tests = await runConfig(id);
    result.configurations.push({ ...cfg, tests });
  }
  return result;
}

module.exports = { configurations, runConfig, runConfigsSequential };
