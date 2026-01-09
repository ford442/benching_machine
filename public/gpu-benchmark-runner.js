/**
 * GPU Benchmark Runner for Browser
 * Integrates WebGL and WebGPU benchmarks
 */

class GPUBenchmarkRunner {
  constructor() {
    this.webglBenchmarks = null;
    this.webgpuBenchmarks = null;
    this.results = [];
  }

  /**
   * Load benchmark scripts dynamically
   */
  async loadBenchmarkScripts() {
    // Check if scripts are already loaded
    if (window.WebGLBenchmarks && window.WebGPUBenchmarks) {
      return true;
    }

    // Load WebGL benchmarks
    if (!window.WebGLBenchmarks) {
      await this.loadScript('/webgl-benchmarks.js');
    }

    // Load WebGPU benchmarks
    if (!window.WebGPUBenchmarks) {
      await this.loadScript('/webgpu-benchmarks.js');
    }

    return true;
  }

  /**
   * Helper to load script
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Run WebGL benchmarks
   */
  async runWebGLBenchmarks() {
    try {
      if (!window.WebGLBenchmarks) {
        console.warn('WebGL benchmarks not loaded');
        return [];
      }

      this.webglBenchmarks = new window.WebGLBenchmarks();
      
      if (!this.webglBenchmarks.isSupported) {
        console.warn('WebGL not supported');
        return [{
          name: 'WebGL',
          error: 'WebGL not supported in this browser',
          opsPerSec: 0
        }];
      }

      const result = await this.webglBenchmarks.runAll();
      return result.results || [];
    } catch (error) {
      console.error('WebGL benchmark error:', error);
      return [{
        name: 'WebGL',
        error: error.message,
        opsPerSec: 0
      }];
    }
  }

  /**
   * Run WebGPU benchmarks
   */
  async runWebGPUBenchmarks() {
    try {
      if (!window.WebGPUBenchmarks) {
        console.warn('WebGPU benchmarks not loaded');
        return [];
      }

      this.webgpuBenchmarks = new window.WebGPUBenchmarks();
      const initialized = await this.webgpuBenchmarks.initialize();
      
      if (!initialized) {
        console.warn('WebGPU not supported');
        return [{
          name: 'WebGPU',
          error: 'WebGPU not supported in this browser',
          opsPerSec: 0
        }];
      }

      const result = await this.webgpuBenchmarks.runAll();
      return result.results || [];
    } catch (error) {
      console.error('WebGPU benchmark error:', error);
      return [{
        name: 'WebGPU',
        error: error.message,
        opsPerSec: 0
      }];
    }
  }

  /**
   * Run all GPU benchmarks
   */
  async runAll() {
    try {
      await this.loadBenchmarkScripts();
      
      const webglResults = await this.runWebGLBenchmarks();
      const webgpuResults = await this.runWebGPUBenchmarks();
      
      this.results = [...webglResults, ...webgpuResults];
      
      return {
        timestamp: new Date().toISOString(),
        results: this.results
      };
    } catch (error) {
      console.error('GPU benchmark runner error:', error);
      return {
        timestamp: new Date().toISOString(),
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Get formatted results for display
   */
  getFormattedResults() {
    return this.results.map(result => ({
      name: result.name,
      opsPerSec: Math.round(result.opsPerSec),
      timeMs: result.timeMs ? result.timeMs.toFixed(2) : 'N/A',
      error: result.error || null
    }));
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GPUBenchmarkRunner;
}

// Make available globally for React components
if (typeof window !== 'undefined') {
  window.GPUBenchmarkRunner = GPUBenchmarkRunner;
}
