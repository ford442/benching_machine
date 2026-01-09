// Minimal AssemblyScript benchmark exports
// Compile with: asc assembly/index.ts --outFile public/benchmarks/physics/candy_physics.wasm ...
export function fibonacci(n: i32): i32 {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

export function matrix_multiply(size: i32): Float64Array {
  let a = new Array<Float64Array>(size);
  let b = new Array<Float64Array>(size);
  let result = new Array<Float64Array>(size);
  for (let i = 0; i < size; i++) {
    a[i] = new Float64Array(size);
    b[i] = new Float64Array(size);
    result[i] = new Float64Array(size);
    for (let j = 0; j < size; j++) {
      a[i][j] = 1.0;
      b[i][j] = 2.0;
    }
  }
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let s = 0.0;
      for (let k = 0; k < size; k++) {
        s += a[i][k] * b[k][j];
      }
      result[i][j] = s;
    }
  }
  // flatten to Float64Array
  let flat = new Float64Array(size * size);
  let idx = 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      flat[idx++] = result[i][j];
    }
  }
  return flat;
}
