// backend/benchmarks/configs.js
//
// Config data (configurations, multipliers, machineProfiles) is generated from
// shared/benchmark-registry.json — see scripts/generate-benchmark-config.js.
// This file only holds the mock benchmark-running logic.

const { configurations, multipliers, machineProfiles } = require('./configs.generated');

const generateResult = (baseScore, variance, name) => ({
  name,
  opsPerSec: Math.round(baseScore + Math.random() * variance),
  stats: { mean: baseScore ? baseScore / 1000000 : 0, deviation: variance / 1000000, margin: 2 }
});

function getMultiplier(configId) {
  return multipliers[configId] ?? 1.0;
}

async function runConfig(configId) {
  const m = getMultiplier(configId);
  const supportsWasmThreads = ['wasm_threads','wasm_simd','wasm_max','wasm64','wasmfs'].includes(configId);
  const supportsOpenMP = ['wasm_openmp', 'wasm_max'].includes(configId);
  const isGPU = ['webgl_compute', 'webgpu_compute', 'webgpu_dispatch'].includes(configId);

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

module.exports = { configurations, runConfig, runConfigsSequential, machineProfiles };
