/**
 * Cross-machine hardware profiles for frontend playback comparison.
 * Mirrors backend/benchmarks/configs.js so the UI can simulate
 * how baseline results would perform on different hardware classes.
 */

export const machineProfiles = {
  reference: {
    id: 'reference',
    name: 'Reference Workstation',
    description: 'Baseline capture machine — 8-core x86 CPU, integrated GPU, 16 GB RAM.',
    multiplier: 1.0,
    familyMultipliers: { js: 1.0, wasm: 1.0, gpu: 1.0 },
    nativeFamily: 'js',
  },
  single_core_js: {
    id: 'single_core_js',
    name: 'Single-Core JS',
    description: 'Low-power single-core CPU, no SIMD, no threads. JS runs best; WASM and GPU suffer heavy penalties.',
    multiplier: 0.55,
    familyMultipliers: { js: 0.9, wasm: 0.35, gpu: 0.02 },
    nativeFamily: 'js',
  },
  multi_threaded: {
    id: 'multi_threaded',
    name: 'Multi-Threaded WASM',
    description: '16-core desktop with pthread & SIMD128 support. WASM threaded workloads thrive; GPU is secondary.',
    multiplier: 1.3,
    familyMultipliers: { js: 0.85, wasm: 1.9, gpu: 0.4 },
    nativeFamily: 'wasm',
  },
  webgpu_high_end: {
    id: 'webgpu_high_end',
    name: 'WebGPU High-End',
    description: 'Desktop with dedicated RTX-class GPU. Compute shaders dominate; CPU-bound work is comparatively slower.',
    multiplier: 1.6,
    familyMultipliers: { js: 0.6, wasm: 0.7, gpu: 3.2 },
    nativeFamily: 'gpu',
  },
  low_power_mobile: {
    id: 'low_power_mobile',
    name: 'Low-Power Mobile',
    description: 'ARM mobile chip (4-core, Mali GPU). Battery-optimized and thermally constrained across the board.',
    multiplier: 0.3,
    familyMultipliers: { js: 0.75, wasm: 0.5, gpu: 0.35 },
    nativeFamily: 'js',
  },
  dedicated_gpu: {
    id: 'dedicated_gpu',
    name: 'Dedicated GPU Server',
    description: 'Data-center node with A100/H100 class GPU. Massive parallel throughput for compute; CPU is a bottleneck.',
    multiplier: 2.2,
    familyMultipliers: { js: 0.4, wasm: 0.5, gpu: 5.5 },
    nativeFamily: 'gpu',
  },
};

/** Ordered list for dropdowns / selectors. */
export const machineProfileList = Object.values(machineProfiles);

/** Get a profile by its id. */
export function getMachineProfile(id) {
  return machineProfiles[id] || machineProfiles.reference;
}
