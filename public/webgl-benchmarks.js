/**
 * WebGL Benchmark Module
 * Browser-based GPU benchmarks using WebGL
 */

class WebGLBenchmarks {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.gl = null;
    this.isSupported = false;
    this.initialize();
  }

  initialize() {
    try {
      this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      this.isSupported = !!this.gl;
      if (this.isSupported) {
        console.log('WebGL initialized successfully');
      }
    } catch (e) {
      console.error('WebGL not supported:', e);
    }
  }

  /**
   * Create and compile a shader
   */
  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  /**
   * Create a shader program
   */
  createProgram(vertexSource, fragmentSource) {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }

  /**
   * Matrix Multiplication using WebGL
   * Multiplies two NxN matrices on the GPU
   */
  async matrixMultiply(size = 256) {
    if (!this.isSupported) {
      throw new Error('WebGL not supported');
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision highp float;
      uniform sampler2D u_matrixA;
      uniform sampler2D u_matrixB;
      uniform float u_size;
      varying vec2 v_texCoord;
      
      void main() {
        float sum = 0.0;
        for (float k = 0.0; k < ${size}.0; k += 1.0) {
          vec4 a = texture2D(u_matrixA, vec2(k / u_size, v_texCoord.y));
          vec4 b = texture2D(u_matrixB, vec2(v_texCoord.x, k / u_size));
          sum += a.r * b.r;
        }
        gl_FragColor = vec4(sum, 0.0, 0.0, 1.0);
      }
    `;

    const program = this.createProgram(vertexShaderSource, fragmentShaderSource);
    
    // Create texture data for matrices
    const matrixA = new Float32Array(size * size);
    const matrixB = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) {
      matrixA[i] = Math.random();
      matrixB[i] = Math.random();
    }

    // Setup textures
    const textureA = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, textureA);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, size, size, 0, 
                       this.gl.LUMINANCE, this.gl.FLOAT, matrixA);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    const textureB = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, textureB);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, size, size, 0, 
                       this.gl.LUMINANCE, this.gl.FLOAT, matrixB);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    // Setup framebuffer
    const framebuffer = this.gl.createFramebuffer();
    const resultTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, resultTexture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, size, size, 0, 
                       this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, 
                                 this.gl.TEXTURE_2D, resultTexture, 0);

    // Render
    this.gl.useProgram(program);
    this.gl.viewport(0, 0, size, size);
    
    // Draw full-screen quad
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    
    const positionLocation = this.gl.getAttribLocation(program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.finish();

    // Cleanup
    this.gl.deleteTexture(textureA);
    this.gl.deleteTexture(textureB);
    this.gl.deleteTexture(resultTexture);
    this.gl.deleteFramebuffer(framebuffer);
    this.gl.deleteProgram(program);
    this.gl.deleteBuffer(buffer);

    return true;
  }

  /**
   * Particle Simulation using WebGL
   */
  async particleSimulation(numParticles = 10000) {
    if (!this.isSupported) {
      throw new Error('WebGL not supported');
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = 2.0;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
      }
    `;

    const program = this.createProgram(vertexShaderSource, fragmentShaderSource);
    
    // Generate particle positions
    const positions = new Float32Array(numParticles * 2);
    for (let i = 0; i < numParticles * 2; i++) {
      positions[i] = Math.random() * 2 - 1;
    }

    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    this.gl.useProgram(program);
    const positionLocation = this.gl.getAttribLocation(program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    this.canvas.width = 512;
    this.canvas.height = 512;
    this.gl.viewport(0, 0, 512, 512);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.POINTS, 0, numParticles);
    this.gl.finish();

    this.gl.deleteProgram(program);
    this.gl.deleteBuffer(buffer);

    return true;
  }

  /**
   * Image Processing - Edge Detection using WebGL
   */
  async imageProcessing(width = 512, height = 512) {
    if (!this.isSupported) {
      throw new Error('WebGL not supported');
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_textureSize;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 onePixel = vec2(1.0) / u_textureSize;
        
        // Sobel edge detection
        float tl = texture2D(u_image, v_texCoord + vec2(-onePixel.x, onePixel.y)).r;
        float tm = texture2D(u_image, v_texCoord + vec2(0.0, onePixel.y)).r;
        float tr = texture2D(u_image, v_texCoord + vec2(onePixel.x, onePixel.y)).r;
        float ml = texture2D(u_image, v_texCoord + vec2(-onePixel.x, 0.0)).r;
        float mr = texture2D(u_image, v_texCoord + vec2(onePixel.x, 0.0)).r;
        float bl = texture2D(u_image, v_texCoord + vec2(-onePixel.x, -onePixel.y)).r;
        float bm = texture2D(u_image, v_texCoord + vec2(0.0, -onePixel.y)).r;
        float br = texture2D(u_image, v_texCoord + vec2(onePixel.x, -onePixel.y)).r;
        
        float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
        float gy = -tl - 2.0*tm - tr + bl + 2.0*bm + br;
        float g = sqrt(gx*gx + gy*gy);
        
        gl_FragColor = vec4(vec3(g), 1.0);
      }
    `;

    const program = this.createProgram(vertexShaderSource, fragmentShaderSource);

    // Create dummy image data
    const imageData = new Uint8Array(width * height * 4);
    for (let i = 0; i < imageData.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      imageData[i] = val;
      imageData[i + 1] = val;
      imageData[i + 2] = val;
      imageData[i + 3] = 255;
    }

    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, height, 0, 
                       this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    this.gl.useProgram(program);
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
    
    const positionLocation = this.gl.getAttribLocation(program, 'a_position');
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    const textureSizeLocation = this.gl.getUniformLocation(program, 'u_textureSize');
    this.gl.uniform2f(textureSizeLocation, width, height);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.finish();

    this.gl.deleteTexture(texture);
    this.gl.deleteProgram(program);
    this.gl.deleteBuffer(buffer);

    return true;
  }

  /**
   * Run all WebGL benchmarks
   */
  async runAll() {
    if (!this.isSupported) {
      return {
        error: 'WebGL not supported',
        results: []
      };
    }

    const results = [];

    // Matrix Multiply
    const matrixStart = performance.now();
    await this.matrixMultiply(256);
    const matrixTime = performance.now() - matrixStart;
    results.push({
      name: 'Matrix Multiply WebGL (256x256)',
      opsPerSec: 1000 / matrixTime,
      timeMs: matrixTime
    });

    // Particle Simulation
    const particleStart = performance.now();
    await this.particleSimulation(10000);
    const particleTime = performance.now() - particleStart;
    results.push({
      name: 'Particle Simulation WebGL (10000 particles)',
      opsPerSec: 1000 / particleTime,
      timeMs: particleTime
    });

    // Image Processing
    const imageStart = performance.now();
    await this.imageProcessing(512, 512);
    const imageTime = performance.now() - imageStart;
    results.push({
      name: 'Image Processing WebGL (512x512)',
      opsPerSec: 1000 / imageTime,
      timeMs: imageTime
    });

    return { results };
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebGLBenchmarks;
}

// Make available globally for React components
if (typeof window !== 'undefined') {
  window.WebGLBenchmarks = WebGLBenchmarks;
}
