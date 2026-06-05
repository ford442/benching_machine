# WebGPU WASM Dispatch Benchmark

Experimental real Emscripten + WebGPU benchmark for measuring CPU-side WebGPU
command creation/submission overhead from C++/WASM.

Emscripten WebGPU support is still maturing. Expect API differences across
Emscripten versions, async device creation constraints, limited feature/limit
coverage compared with native Dawn, and browser-specific behavior.

## Build

From this directory:

```bash
chmod +x build.sh
./build.sh
```

The script writes:

```text
public/wasm/webgpu_bench.js
public/wasm/webgpu_bench.wasm
```

The exact command is:

```bash
emcc main.cpp -o ../../../public/wasm/webgpu_bench.js \
  -std=c++17 \
  -O3 \
  -s USE_WEBGPU=1 \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=createWebGPUWasmBenchmark \
  -s ENVIRONMENT=web \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s "EXPORTED_FUNCTIONS=['_initializeWebGPUDevice','_isWebGPUDeviceReady','_hasWebGPUDeviceFailed','_runGenerativeShaderOverhead']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']"
```

Use `-O3` for production timing runs. Use `-O2` while iterating if compile time
matters more than final throughput. Avoid `-O0` for benchmark numbers because
it measures debug overhead more than WebGPU glue overhead.

## React Integration

`src/utils/webgpuWasmBenchLoader.js` looks for `public/wasm/webgpu_bench.js`
first, then falls back to the older `webgpu_wasm_benchmark.js` name. If neither
artifact loads, `webgpu_dispatch_wasm` in `BenchmarkRunner.js` keeps using the
simulated educational fallback.

## JavaScript Usage

The output is modularized. Load it, trigger async WebGPU device creation, wait
until the device is ready, then call the exported benchmark:

```js
const module = await createWebGPUWasmBenchmark();

module.ccall('initializeWebGPUDevice', 'number', [], []);

const waitForDevice = () =>
  new Promise((resolve, reject) => {
    const poll = () => {
      if (module.ccall('isWebGPUDeviceReady', 'number', [], [])) {
        resolve();
        return;
      }

      if (module.ccall('hasWebGPUDeviceFailed', 'number', [], [])) {
        reject(new Error('WASM WebGPU device creation failed'));
        return;
      }

      setTimeout(poll, 16);
    };

    poll();
  });

await waitForDevice();

const fps = module.ccall(
  'runGenerativeShaderOverhead',
  'number',
  ['number'],
  [5000]
);
```

The direct exported symbol is also available as:

```js
const fps = module._runGenerativeShaderOverhead(5000);
```

## Current Limitations

- Device creation is asynchronous. Calling `runGenerativeShaderOverhead` before
  readiness returns `-1` and starts initialization if needed.
- The benchmark loop updates a `time` uniform, creates a command encoder,
  begins a compute pass, dispatches 16 workgroups over a 1,024-float storage
  buffer, and submits the command buffer each frame.
- The measured hot path is API-heavy by design. The main Emscripten glue costs
  are expected around `Queue::WriteBuffer`, encoder/pass creation, and
  `Queue::Submit`.
- Browser WebGPU support, adapter selection, exposed limits, and error behavior
  can differ between Chrome versions and platforms.
- Emscripten's `-s USE_WEBGPU=1` API surface may differ from the newer
  `--use-port=emdawnwebgpu` flow used by some Dawn C++ examples.
- Keep the simulated fallback because many local and CI environments do not
  have Emscripten installed or cannot expose browser WebGPU.
