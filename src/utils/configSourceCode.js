/**
 * Representative source-code snippets for each benchmark configuration.
 * Used by the User Bench playback page to show visitors what each
 * compiler / toolchain actually runs under the hood.
 */

export const configSourceCode = {
  js_inline: `// ── Inline Script (HTML) ──
function fibonacci(n) {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}

for (let i = 0; i < 100000; i++) {
  fibonacci(35);
}`,

  js_external: `// ── External File (.js) ──
// math.js
function fibonacci(n) {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}

module.exports = { fibonacci };`,

  js_wasm_std: `// ── JS + WASM (Vanilla Loading) ──
const wasmModule = await WebAssembly.compileStreaming(
  fetch('./module.wasm')
);
const instance = await WebAssembly.instantiate(wasmModule, imports);
instance.exports.fibonacci(35);`,

  js_terser: `// ── Terser (Minified & Mangled) ──
// Input: standard JS
// Output: minified by Terser
function f(n){return n<2?n:f(n-1)+f(n-2)}for(let i=0;i<1e5;i++)f(35);`,

  js_closure: `// ── Google Closure Compiler (ADVANCED) ──
// Input: standard JS
// Output: aggressively optimized
function a(b){return 2>b?b:a(b-1)+a(b-2)}for(var c=0;1E5>c;c++)a(35);`,

  js_esbuild: `// ── esbuild (Go-based Bundler) ──
// Bundled & tree-shaken in milliseconds
import { fib } from './math.js';
for (let i = 0; i < 100000; i++) fib(35);`,

  js_swc: `// ── SWC (Rust-based Transpiler) ──
// Babel-compatible, written in Rust
const fib = (n) => n < 2 ? n : fib(n - 1) + fib(n - 2);
for (let i = 0; i < 100000; i++) fib(35);`,

  js_tsc: `// ── TypeScript (tsc → ES2020) ──
function fibonacci(n: number): number {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}
for (let i = 0; i < 100000; i++) {
  fibonacci(35);
}`,

  js_bigint: `// ── JS BigInt (64-bit Integer Math) ──
function fib(n) {
  let a = 0n, b = 1n;
  for (let i = 0n; i < n; i++) {
    [a, b] = [b, a + b];
  }
  return a;
}
fib(1000n);`,

  wasm_rust: `// ── Rust → wasm-pack ──
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    if n < 2 { n }
    else { fibonacci(n - 1) + fibonacci(n - 2) }
}`,

  wasm_cheerp: `// ── Cheerp (C++ → WASM) ──
#include <cheerp/client.h>

[[cheerp::jsexport]]
int fibonacci(int n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,

  wasm_emcc: `// ── Emscripten (Pure C → WASM) ──
#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int fibonacci(int n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,

  wasm_javy: `// ── Javy (JS → QuickJS → WASM) ──
// Your JS code runs inside a QuickJS WASM runtime
function fibonacci(n) {
  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
}
module.exports = { fibonacci };`,

  wasm_as: `// ── AssemblyScript ──
export function fibonacci(n: i32): i32 {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`,

  wasm_simd: `// ── WASM + SIMD128 ──
#include <wasm_simd128.h>

v128_t add_vectors(v128_t a, v128_t b) {
  return wasm_i32x4_add(a, b);  // 4× i32 in one instruction
}

// Benchmark: vectorized matrix multiplication`,

  wasm_threads: `// ── WASM + Pthreads ──
#include <pthread.h>
#include <emscripten.h>

void* worker(void* arg) {
  int id = (int)(size_t)arg;
  // SharedArrayBuffer backed heap
  return NULL;
}`,

  wasm_openmp: `// ── WASM + OpenMP ──
#include <omp.h>

#pragma omp parallel for
for (int i = 0; i < N; i++) {
  boids[i].update(dt);
}
// libomp compiled to WASM with pthread support`,

  wasm_max: `// ── WASM Max (Threads + SIMD) ──
#include <wasm_simd128.h>
#include <pthread.h>

// Maximum throughput:
//  1. Vectorize inner loops (SIMD128)
//  2. Shard outer loops across pthreads
#pragma clang loop vectorize(enable)
for (int i = tid; i < N; i += num_threads) {
  v128_t va = wasm_v128_load(&A[i]);
  v128_t vb = wasm_v128_load(&B[i]);
  wasm_v128_store(&C[i], wasm_f32x4_add(va, vb));
}`,

  wasm64: `// ── WASM64 (64-bit Memory) ──
#include <emscripten.h>
#include <stdint.h>

// 64-bit address space (-s MEMORY64=1)
EMSCRIPTEN_KEEPALIVE
int64_t* alloc_buffer(int64_t size) {
  return (int64_t*)malloc(size);
}`,

  wasmfs: `// ── WASMFS (In-Memory Filesystem) ──
#include <emscripten/wasmfs.h>
#include <fstream>

// New POSIX-compatible filesystem in WASM
int main() {
  std::ofstream file("/data/output.bin");
  file.write(buffer, size);
  return 0;
}`,

  webgl_compute: `// ── WebGL Compute (Fragment Shader GPGPU) ──
#version 300 es
precision highp float;

uniform sampler2D u_input;
out vec4 fragColor;

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  // General-Purpose GPU via framebuffer ping-pong
  fragColor = texelFetch(u_input, coord, 0) * 2.0;
}`,

  webgpu_compute: `// ── WebGPU Compute Shader (WGSL) ──
@compute @workgroup_size(64)
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>
) {
  let idx = gid.x;
  let a = buffer_a[idx];
  let b = buffer_b[idx];
  buffer_c[idx] = a * b;
}`,
};
