const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');

let frameCount = 0;
let lastTime = performance.now();
let frameTimes = [];
let longFrameCount = 0;

const fpsEl = document.getElementById('fps');
const frameTimeEl = document.getElementById('frameTime');
const longFramesEl = document.getElementById('longFrames');
const progressBar = document.getElementById('progressBar');

// WebGL setup
const vertexShaderSource = `attribute vec4 a_position; void main() { gl_Position = a_position; }`;
const fragmentShaderSource = `precision mediump float; uniform float u_time; void main() { vec2 uv = gl_FragCoord.xy / vec2(600.0, 400.0); float color = 0.5 + 0.5 * sin(u_time + uv.x * 10.0); gl_FragColor = vec4(color, color * 0.8, 1.0 - color, 1.0); }`;

function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

const posLoc = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

const timeLoc = gl.getUniformLocation(program, 'u_time');

function loop() {
  const now = performance.now();
  const delta = now - lastTime;
  lastTime = now;

  frameCount++;
  frameTimes.push(delta);
  if (frameTimes.length > 60) frameTimes.shift();

  if (delta > 20) longFrameCount++;

  if (frameCount % 30 === 0) {
    const avg = frameTimes.reduce((a,b)=>a+b,0) / frameTimes.length;
    fpsEl.textContent = (1000 / avg).toFixed(1);
    frameTimeEl.textContent = avg.toFixed(2);
    longFramesEl.textContent = longFrameCount;
  }

  gl.uniform1f(timeLoc, now * 0.001);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  const progress = (Math.sin(now * 0.002) + 1) / 2;
  progressBar.style.width = (progress * 100) + '%';

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
console.log('%c[UTF Benchmark] Started', 'color:#0af');
