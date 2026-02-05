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
   * Naive Matrix Multiplication (Global Memory)
   */
  async matrixMultiplyNaive(size = 256) {
    if (!this.isSupported) throw new Error('WebGPU not supported');

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

    return this._runMatrixOp(size, shaderCode, 'Naive');
  }

  /**
   * Tiled Matrix Multiplication (Shared Memory / Thread Cooperative)
   */
  async matrixMultiplyTiled(size = 256) {
    if (!this.isSupported) throw new Error('WebGPU not supported');

    const BLOCK_SIZE = 16;

    const shaderCode = `
      @group(0) @binding(0) var<storage, read> matrixA: array<f32>;
      @group(0) @binding(1) var<storage, read> matrixB: array<f32>;
      @group(0) @binding(2) var<storage, read_write> result: array<f32>;
      @group(0) @binding(3) var<uniform> size: u32;

      var<workgroup> tileA: array<array<f32, ${BLOCK_SIZE}>, ${BLOCK_SIZE}>;
      var<workgroup> tileB: array<array<f32, ${BLOCK_SIZE}>, ${BLOCK_SIZE}>;

      @compute @workgroup_size(${BLOCK_SIZE}, ${BLOCK_SIZE})
      fn main(
        @builtin(global_invocation_id) global_id: vec3<u32>,
        @builtin(local_invocation_id) local_id: vec3<u32>,
        @builtin(workgroup_id) group_id: vec3<u32>
      ) {
        let row = global_id.y;
        let col = global_id.x;
        let localRow = local_id.y;
        let localCol = local_id.x;

        var sum = 0.0;

        // Loop over tiles
        for (var t = 0u; t < size / ${BLOCK_SIZE}u; t = t + 1u) {
          // Load one tile into shared memory
          let tiledRow = row;
          let tiledCol = t * ${BLOCK_SIZE}u + localCol;
          tileA[localRow][localCol] = matrixA[tiledRow * size + tiledCol];

          let tiledRowB = t * ${BLOCK_SIZE}u + localRow;
          let tiledColB = col;
          tileB[localRow][localCol] = matrixB[tiledRowB * size + tiledColB];

          // Wait for all threads in workgroup to load
          workgroupBarrier();

          // Compute dot product for this tile
          for (var k = 0u; k < ${BLOCK_SIZE}u; k = k + 1u) {
            sum = sum + tileA[localRow][k] * tileB[k][localCol];
          }

          // Wait before overwriting shared memory
          workgroupBarrier();
        }

        if (row < size && col < size) {
          result[row * size + col] = sum;
        }
      }
    `;

    return this._runMatrixOp(size, shaderCode, 'Tiled');
  }

  async _runMatrixOp(size, shaderCode, label) {
    const shaderModule = this.device.createShaderModule({ code: shaderCode });
    const matrixSize = size * size;
    const matrixA = new Float32Array(matrixSize).map(() => Math.random());
    const matrixB = new Float32Array(matrixSize).map(() => Math.random());

    const matrixABuffer = this._createBuffer(matrixA, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const matrixBBuffer = this._createBuffer(matrixB, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const resultBuffer = this._createBuffer(new Float32Array(matrixSize), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const sizeBuffer = this._createBuffer(new Uint32Array([size]), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

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

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    const workgroupSize = label === 'Tiled' ? 16 : 8;
    passEncoder.dispatchWorkgroups(Math.ceil(size / workgroupSize), Math.ceil(size / workgroupSize));
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();

    matrixABuffer.destroy();
    matrixBBuffer.destroy();
    resultBuffer.destroy();
    sizeBuffer.destroy();

    return true;
  }

  _createBuffer(data, usage) {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage,
      mappedAtCreation: true,
    });
    new (data instanceof Uint32Array ? Uint32Array : Float32Array)(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
  }

  /**
   * Particle Simulation using WebGPU Compute Shader
   */
  async particleSimulation(numParticles = 10000, steps = 10) {
    if (!this.isSupported) throw new Error('WebGPU not supported');

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
        particle.position = particle.position + particle.velocity * deltaTime;
        
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
    const particleData = new Float32Array(numParticles * 4);
    for (let i = 0; i < numParticles; i++) {
      particleData[i * 4 + 0] = Math.random() * 2 - 1;
      particleData[i * 4 + 1] = Math.random() * 2 - 1;
      particleData[i * 4 + 2] = (Math.random() - 0.5) * 0.02;
      particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.02;
    }

    const particleBuffer = this._createBuffer(particleData, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const deltaTimeBuffer = this._createBuffer(new Float32Array([0.016]), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

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
    particleBuffer.destroy();
    deltaTimeBuffer.destroy();
    return true;
  }

  /**
   * Image Processing using WebGPU Compute Shader
   */
  async imageProcessing(width = 512, height = 512) {
    if (!this.isSupported) throw new Error('WebGPU not supported');

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
    const imageSize = width * height;
    const imageData = new Float32Array(imageSize * 4).map(() => Math.random());

    const inputBuffer = this._createBuffer(imageData, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
    const outputBuffer = this._createBuffer(new Float32Array(imageSize * 4), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const dimensionsBuffer = this._createBuffer(new Uint32Array([width, height]), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

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

    inputBuffer.destroy();
    outputBuffer.destroy();
    dimensionsBuffer.destroy();
    return true;
  }

  /**
   * Ray Marching using WebGPU Compute Shader
   */
  async rayMarching(width = 256, height = 256, maxSteps = 50) {
    if (!this.isSupported) throw new Error('WebGPU not supported');

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
        
        let uv = vec2<f32>(
          (f32(x) / f32(width) - 0.5) * 2.0,
          (f32(y) / f32(height) - 0.5) * 2.0
        );
        
        let ro = vec3<f32>(0.0, 0.0, -3.0);
        let rd = normalize(vec3<f32>(uv.x, uv.y, 1.0));
        
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
          if (t > 10.0) { break; }
        }
        
        output[y * width + x] = hit;
      }
    `;

    const shaderModule = this.device.createShaderModule({ code: shaderCode });
    const outputBuffer = this._createBuffer(new Float32Array(width * height * 4), GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC);
    const dimensionsBuffer = this._createBuffer(new Uint32Array([width, height]), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    const maxStepsBuffer = this._createBuffer(new Uint32Array([maxSteps]), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

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
      return { error: 'WebGPU not supported', results: [] };
    }

    const results = [];
    const runBench = async (name, fn, ...args) => {
      try {
        const start = performance.now();
        await fn.apply(this, args);
        const time = performance.now() - start;
        results.push({ name, opsPerSec: 1000 / time, timeMs: time });
      } catch (e) { console.error(`${name} failed:`, e); }
    };

    // 1. Matrix Ops (Comparison)
    await runBench('Matrix Mult (Naive Global)', this.matrixMultiplyNaive, 512);
    await runBench('Matrix Mult (Tiled Shared)', this.matrixMultiplyTiled, 512);

    // 2. Compute Workloads
    await runBench('Physics Simulation', this.particleSimulation, 10000, 10);
    await runBench('Image Processing', this.imageProcessing, 512, 512);
    await runBench('Ray Marching', this.rayMarching, 256, 256, 50);

    return { results };
  }
}

if (typeof module !== 'undefined') module.exports = WebGPUBenchmarks;
if (typeof window !== 'undefined') window.WebGPUBenchmarks = WebGPUBenchmarks;
