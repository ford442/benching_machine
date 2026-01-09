const Benchmark = require('benchmark');

/**
 * GPU Benchmark Module (CPU-side implementations for CLI)
 * For actual WebGL/WebGPU benchmarks, see public/webgl-benchmarks.js and public/webgpu-benchmarks.js
 * This module provides CPU-based implementations for comparison and CLI execution
 */

class GPUBenchmark {
  constructor() {
    this.suite = new Benchmark.Suite('GPU');
    this.results = [];
  }

  /**
   * CPU-based Matrix Multiplication (for comparison with GPU)
   * This will be compared against WebGL/WebGPU implementations in the browser
   */
  matrixMultiplyCPU(size = 256) {
    const a = Array(size).fill(0).map(() => 
      Array(size).fill(0).map(() => Math.random())
    );
    const b = Array(size).fill(0).map(() => 
      Array(size).fill(0).map(() => Math.random())
    );
    
    const result = Array(size).fill(0).map(() => Array(size).fill(0));
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let sum = 0;
        for (let k = 0; k < size; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }
    
    return result;
  }

  /**
   * CPU-based Particle Simulation (for comparison with GPU)
   * Simulates basic physics for N particles
   */
  particleSimulationCPU(numParticles = 10000, steps = 10) {
    const particles = Array(numParticles).fill(0).map(() => ({
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      mass: Math.random() * 10 + 1
    }));

    for (let step = 0; step < steps; step++) {
      // Update positions
      for (let i = 0; i < particles.length; i++) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        
        // Simple boundary conditions
        if (particles[i].x < 0 || particles[i].x > 1000) particles[i].vx *= -0.9;
        if (particles[i].y < 0 || particles[i].y > 1000) particles[i].vy *= -0.9;
      }
    }

    return particles;
  }

  /**
   * CPU-based Image Processing - Convolution Filter (for comparison with GPU)
   * Applies a 3x3 kernel to an image
   */
  imageConvolutionCPU(width = 512, height = 512) {
    // Create dummy image data
    const imageData = new Float32Array(width * height * 4);
    for (let i = 0; i < imageData.length; i++) {
      imageData[i] = Math.random();
    }

    // Sobel edge detection kernel
    const kernel = [
      -1, -1, -1,
      -1,  8, -1,
      -1, -1, -1
    ];

    const output = new Float32Array(width * height * 4);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels only
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              const kidx = (ky + 1) * 3 + (kx + 1);
              sum += imageData[idx] * kernel[kidx];
            }
          }
          output[(y * width + x) * 4 + c] = sum;
        }
        output[(y * width + x) * 4 + 3] = 1.0; // Alpha
      }
    }

    return output;
  }

  /**
   * CPU-based Ray Marching (for comparison with GPU)
   * Simple sphere ray marching
   */
  rayMarchingCPU(width = 256, height = 256, steps = 50) {
    const output = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Ray direction
        const dx = (x / width - 0.5) * 2;
        const dy = (y / height - 0.5) * 2;
        
        // Ray marching
        let t = 0;
        for (let i = 0; i < steps; i++) {
          const px = dx * t;
          const py = dy * t;
          const pz = t;
          
          // Distance to sphere at origin
          const dist = Math.sqrt(px * px + py * py + pz * pz) - 1.0;
          
          if (dist < 0.001) {
            output[y * width + x] = 1.0 - (i / steps);
            break;
          }
          
          t += Math.max(0.01, dist);
          if (t > 10) break;
        }
      }
    }

    return output;
  }

  /**
   * Run all GPU benchmarks (CPU implementations)
   */
  async run() {
    return new Promise((resolve) => {
      this.suite
        .add('Matrix Multiply CPU (256x256)', () => {
          this.matrixMultiplyCPU(256);
        })
        .add('Particle Simulation CPU (1000 particles, 10 steps)', () => {
          this.particleSimulationCPU(1000, 10);
        })
        .add('Image Convolution CPU (512x512)', () => {
          this.imageConvolutionCPU(512, 512);
        })
        .add('Ray Marching CPU (256x256, 50 steps)', () => {
          this.rayMarchingCPU(256, 256, 50);
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

module.exports = GPUBenchmark;
