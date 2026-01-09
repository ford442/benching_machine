/**
 * WebGPU Benchmark Module
 * Browser-based GPU benchmarks using WebGPU compute shaders
 */

class WebGPUBenchmarks {
  constructor() {
    this.adapter = null;
    this.device = null;
    this.isSupported = false;
  }

  /**
   * Initialize WebGPU
   */
  async initialize() {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported in this browser');
      return false;
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter();
      if (!this.adapter) {
        console.warn('No WebGPU adapter found');
        return false;
      }

      this.device = await this.adapter.requestDevice();
      this.isSupported = true;
      console.log('WebGPU initialized successfully');
      return true;
    } catch (e) {
      console.error('WebGPU initialization failed:', e);
      return false;
    }
  }

  /**
   * Matrix Multiplication using WebGPU Compute Shader
   */
  async matrixMultiply(size = 256) {
    if (!this.isSupported) {
      throw new Error('WebGPU not supported');
    }

    const shaderCode = `
      @group(0) @binding(0) var<storage, read> matrixA: array<f32>;
      @group(0) @binding(1) var<storage, read> matrixB: array<f32>;
      @group(0) @binding(2) var<storage, read_write> result: array<f32>;
      @group(0) @binding(3) var<uniform> size: u32;

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let row = global_id.x;
        let col = global_id.y;
        
        if (row >= size || col >= size) {
          return;
        }
        
        var sum = 0.0;
        for (var k = 0u; k < size; k = k + 1u) {
          sum = sum + matrixA[row * size + k] * matrixB[k * size + col];
        }
        
        result[row * size + col] = sum;
      }
    `;

    const shaderModule = this.device.createShaderModule({ code: shaderCode });

    // Create input matrices
    const matrixSize = size * size;
    const matrixA = new Float32Array(matrixSize);
    const matrixB = new Float32Array(matrixSize);
    for (let i = 0; i < matrixSize; i++) {
      matrixA[i] = Math.random();
      matrixB[i] = Math.random();
    }

    // Create GPU buffers
    const matrixABuffer = this.device.createBuffer({
      size: matrixA.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(matrixABuffer, 0, matrixA);

    const matrixBBuffer = this.device.createBuffer({
      size: matrixB.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(matrixBBuffer, 0, matrixB);

    const resultBuffer = this.device.createBuffer({
      size: matrixA.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const sizeBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(sizeBuffer, 0, new Uint32Array([size]));

    // Create bind group layout and pipeline
    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: matrixABuffer } },
        { binding: 1, resource: { buffer: matrixBBuffer } },
        { binding: 2, resource: { buffer: resultBuffer } },
        { binding: 3, resource: { buffer: sizeBuffer } },
      ],
    });

    // Execute compute shader
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(size / 8), Math.ceil(size / 8));
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();

    // Cleanup
    matrixABuffer.destroy();
    matrixBBuffer.destroy();
    resultBuffer.destroy();
    sizeBuffer.destroy();

    return true;
  }

  /**
   * Particle Simulation using WebGPU Compute Shader
   */
  async particleSimulation(numParticles = 10000, steps = 10) {
    if (!this.isSupported) {
      throw new Error('WebGPU not supported');
    }

    const shaderCode = `
      struct Particle {
        position: vec2<f32>,
        velocity: vec2<f32>,
      }

      @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
      @group(0) @binding(1) var<uniform> deltaTime: f32;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= arrayLength(&particles)) {
          return;
        }

        var particle = particles[index];
        
        // Update position
        particle.position = particle.position + particle.velocity * deltaTime;
        
        // Boundary conditions
        if (particle.position.x < -1.0 || particle.position.x > 1.0) {
          particle.velocity.x = particle.velocity.x * -0.9;
        }
        if (particle.position.y < -1.0 || particle.position.y > 1.0) {
          particle.velocity.y = particle.velocity.y * -0.9;
        }
        
        particles[index] = particle;
      }
    `;

    const shaderModule = this.device.createShaderModule({ code: shaderCode });

    // Create particle data
    const particleData = new Float32Array(numParticles * 4);
    for (let i = 0; i < numParticles; i++) {
      particleData[i * 4 + 0] = Math.random() * 2 - 1; // x
      particleData[i * 4 + 1] = Math.random() * 2 - 1; // y
      particleData[i * 4 + 2] = (Math.random() - 0.5) * 0.02; // vx
      particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.02; // vy
    }

    const particleBuffer = this.device.createBuffer({
      size: particleData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(particleBuffer, 0, particleData);

    const deltaTimeBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(deltaTimeBuffer, 0, new Float32Array([0.016]));

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: particleBuffer } },
        { binding: 1, resource: { buffer: deltaTimeBuffer } },
      ],
    });

    // Run simulation for multiple steps
    for (let step = 0; step < steps; step++) {
      const commandEncoder = this.device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(numParticles / 64));
      passEncoder.end();
      this.device.queue.submit([commandEncoder.finish()]);
    }

    await this.device.queue.onSubmittedWorkDone();

    // Cleanup
    particleBuffer.destroy();
    deltaTimeBuffer.destroy();

    return true;
  }

  /**
   * Image Processing using WebGPU Compute Shader
   */
  async imageProcessing(width = 512, height = 512) {
    if (!this.isSupported) {
      throw new Error('WebGPU not supported');
    }

    const shaderCode = `
      @group(0) @binding(0) var<storage, read> inputImage: array<vec4<f32>>;
      @group(0) @binding(1) var<storage, read_write> outputImage: array<vec4<f32>>;
      @group(0) @binding(2) var<uniform> dimensions: vec2<u32>;

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let x = global_id.x;
        let y = global_id.y;
        let width = dimensions.x;
        let height = dimensions.y;
        
        if (x >= width || y >= height) {
          return;
        }
        
        // Sobel edge detection
        let tl = inputImage[(y + 1u) * width + (x - 1u)].r;
        let tm = inputImage[(y + 1u) * width + x].r;
        let tr = inputImage[(y + 1u) * width + (x + 1u)].r;
        let ml = inputImage[y * width + (x - 1u)].r;
        let mr = inputImage[y * width + (x + 1u)].r;
        let bl = inputImage[(y - 1u) * width + (x - 1u)].r;
        let bm = inputImage[(y - 1u) * width + x].r;
        let br = inputImage[(y - 1u) * width + (x + 1u)].r;
        
        let gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
        let gy = -tl - 2.0*tm - tr + bl + 2.0*bm + br;
        let g = sqrt(gx*gx + gy*gy);
        
        outputImage[y * width + x] = vec4<f32>(g, g, g, 1.0);
      }
    `;

    const shaderModule = this.device.createShaderModule({ code: shaderCode });

    // Create dummy image data
    const imageSize = width * height;
    const imageData = new Float32Array(imageSize * 4);
    for (let i = 0; i < imageSize; i++) {
      const val = Math.random();
      imageData[i * 4 + 0] = val;
      imageData[i * 4 + 1] = val;
      imageData[i * 4 + 2] = val;
      imageData[i * 4 + 3] = 1.0;
    }

    const inputBuffer = this.device.createBuffer({
      size: imageData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(inputBuffer, 0, imageData);

    const outputBuffer = this.device.createBuffer({
      size: imageData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const dimensionsBuffer = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(dimensionsBuffer, 0, new Uint32Array([width, height]));

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: dimensionsBuffer } },
      ],
    });

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();

    // Cleanup
    inputBuffer.destroy();
    outputBuffer.destroy();
    dimensionsBuffer.destroy();

    return true;
  }

  /**
   * Ray Marching using WebGPU Compute Shader
   */
  async rayMarching(width = 256, height = 256, maxSteps = 50) {
    if (!this.isSupported) {
      throw new Error('WebGPU not supported');
    }

    const shaderCode = `
      @group(0) @binding(0) var<storage, read_write> output: array<f32>;
      @group(0) @binding(1) var<uniform> dimensions: vec2<u32>;
      @group(0) @binding(2) var<uniform> maxSteps: u32;

      fn sdSphere(p: vec3<f32>, r: f32) -> f32 {
        return length(p) - r;
      }

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let x = global_id.x;
        let y = global_id.y;
        let width = dimensions.x;
        let height = dimensions.y;
        
        if (x >= width || y >= height) {
          return;
        }
        
        // Ray direction
        let uv = vec2<f32>(
          (f32(x) / f32(width) - 0.5) * 2.0,
          (f32(y) / f32(height) - 0.5) * 2.0
        );
        
        let ro = vec3<f32>(0.0, 0.0, -3.0); // Ray origin
        let rd = normalize(vec3<f32>(uv.x, uv.y, 1.0)); // Ray direction
        
        var t = 0.0;
        var hit = 0.0;
        
        for (var i = 0u; i < maxSteps; i = i + 1u) {
          let p = ro + rd * t;
          let d = sdSphere(p, 1.0);
          
          if (d < 0.001) {
            hit = 1.0 - f32(i) / f32(maxSteps);
            break;
          }
          
          t = t + max(0.01, d);
          if (t > 10.0) {
            break;
          }
        }
        
        output[y * width + x] = hit;
      }
    `;

    const shaderModule = this.device.createShaderModule({ code: shaderCode });

    const outputSize = width * height;
    const outputBuffer = this.device.createBuffer({
      size: outputSize * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const dimensionsBuffer = this.device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(dimensionsBuffer, 0, new Uint32Array([width, height]));

    const maxStepsBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(maxStepsBuffer, 0, new Uint32Array([maxSteps]));

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    const bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: outputBuffer } },
        { binding: 1, resource: { buffer: dimensionsBuffer } },
        { binding: 2, resource: { buffer: maxStepsBuffer } },
      ],
    });

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();

    // Cleanup
    outputBuffer.destroy();
    dimensionsBuffer.destroy();
    maxStepsBuffer.destroy();

    return true;
  }

  /**
   * Run all WebGPU benchmarks
   */
  async runAll() {
    const initialized = await this.initialize();
    if (!initialized) {
      return {
        error: 'WebGPU not supported',
        results: []
      };
    }

    const results = [];

    // Matrix Multiply
    try {
      const matrixStart = performance.now();
      await this.matrixMultiply(256);
      const matrixTime = performance.now() - matrixStart;
      results.push({
        name: 'Matrix Multiply WebGPU (256x256)',
        opsPerSec: 1000 / matrixTime,
        timeMs: matrixTime
      });
    } catch (e) {
      console.error('Matrix multiply failed:', e);
    }

    // Particle Simulation
    try {
      const particleStart = performance.now();
      await this.particleSimulation(10000, 10);
      const particleTime = performance.now() - particleStart;
      results.push({
        name: 'Particle Simulation WebGPU (10000 particles, 10 steps)',
        opsPerSec: 1000 / particleTime,
        timeMs: particleTime
      });
    } catch (e) {
      console.error('Particle simulation failed:', e);
    }

    // Image Processing
    try {
      const imageStart = performance.now();
      await this.imageProcessing(512, 512);
      const imageTime = performance.now() - imageStart;
      results.push({
        name: 'Image Processing WebGPU (512x512)',
        opsPerSec: 1000 / imageTime,
        timeMs: imageTime
      });
    } catch (e) {
      console.error('Image processing failed:', e);
    }

    // Ray Marching
    try {
      const rayStart = performance.now();
      await this.rayMarching(256, 256, 50);
      const rayTime = performance.now() - rayStart;
      results.push({
        name: 'Ray Marching WebGPU (256x256, 50 steps)',
        opsPerSec: 1000 / rayTime,
        timeMs: rayTime
      });
    } catch (e) {
      console.error('Ray marching failed:', e);
    }

    return { results };
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebGPUBenchmarks;
}
