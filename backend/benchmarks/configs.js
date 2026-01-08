// Simple configuration-backed mock benchmark runner for server-side
const configurations = [
  { id: 'js_inline', name: 'Inline Script (HTML)', desc: 'Standard JS embedded directly in HTML', color: '#f1e05a' },
  { id: 'js_external', name: 'External .js File', desc: 'Standard JS loaded from external file', color: '#f0db4f' },
  { id: 'js_wasm_std', name: 'JS + WASM (Standard)', desc: 'Vanilla JS loading standard WASM module', color: '#654ff0' },
  { id: 'js_bigint', name: 'JS BigInt Math', desc: 'Pure JS using BigInt primitives', color: '#f7df1e' },
  { id: 'wasm_i64', name: 'WASM i64 (Native)', desc: 'WASM native 64-bit integer ops', color: '#654ff0' },
  { id: 'wasm_rust', name: 'Rust (wasm-pack)', desc: 'Rust compiled via LLVM', color: '#dea584' },
  { id: 'wasm_cheerp', name: 'Cheerp (C++)', desc: 'C++ compiled via Cheerp', color: '#d63031' },
  { id: 'wasm_as', name: 'AssemblyScript', desc: 'TypeScript-like syntax to WASM', color: '#007acc' },
  { id: 'wasm_simd', name: 'WASM + SIMD128', desc: 'Parallel vector operations enabled', color: '#2ecc71' },
  { id: 'wasm_threads', name: 'WASM + Threads', desc: 'Multithreaded via SharedArrayBuffer', color: '#e84393' },
  { id: 'utf16_1ijs', name: 'UTF-16 1ijs + WASM', desc: 'Custom 1ijs format with WASM payload', color: '#e05a33' },
  { id: 'utf16_html', name: 'UTF-16 HTML Loader', desc: 'Full UTF-16 HTML document loading 1ijs', color: '#c0392b' }
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
    case 'js_bigint': return 0.8;
    case 'wasm_i64': return 2.8;
    case 'wasm_rust': return 2.5;
    case 'wasm_cheerp': return 2.45;
    case 'wasm_as': return 2.3;
    case 'wasm_simd': return 3.5;
    case 'wasm_threads': return 4.0;
    case 'utf16_1ijs': return 2.6;
    case 'utf16_html': return 2.7;
    default: return 1.0;
  }
}

async function runConfig(configId) {
  const m = getMultiplier(configId);
  const supportsWasmThreads = ['js_wasm_std','utf16_1ijs','utf16_html','wasm_threads','wasm_simd','wasm_rust','wasm_as','wasm_cheerp'].includes(configId);
  const supportsOpenMP = ['utf16_1ijs','utf16_html','wasm_rust','wasm_cheerp'].includes(configId);

  // Simulate runtime latency
  const startupDelay = (configId === 'utf16_html') ? 100 : (configId === 'utf16_1ijs' ? 50 : 0);
  await new Promise(r => setTimeout(r, 800 + startupDelay + Math.random() * 800));

  return [
    generateResult(120000 * m, 20000, 'Fibonacci (Recursive)'),
    generateResult(90000 * m * (configId === 'js_bigint' ? 0.6 : 1), 15000, 'Fibonacci (BigInt/i64)'),
    generateResult(45000 * m, 5000, 'Matrix Multiply'),
    generateResult(45000 * (m * (supportsWasmThreads ? 1.8 : 0.5)), 8000, 'Matrix Multiply (WASM Threads)'),
    generateResult(60000 * (supportsOpenMP ? (m * 2.2) : (m * 0.4)), 10000, 'Matrix Multiply (OpenMP SIMD)'),
    generateResult(85000 * m, 10000, 'Prime Check'),
    generateResult(200000 * (m * 0.5), 30000, 'Parse/Load Time (Inv)')
  ];
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
