let cachedBench = null;
let loadPromise = null;

const DEFAULT_NUM_FRAMES = 5000;
const DEVICE_READY_TIMEOUT_MS = 5000;

const publicUrl = process.env.PUBLIC_URL || '';

const candidateScripts = [
  `${publicUrl}/wasm/webgpu_bench.js`,
  `${publicUrl}/wasm/webgpu_wasm_benchmark.js`
];

async function fileExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && !(response.headers.get('content-type') || '').includes('text/html');
  } catch {
    return false;
  }
}

function loadScriptOnce(src) {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function callNumber(module, name, args = []) {
  if (typeof module.ccall === 'function') {
    return module.ccall(name, 'number', args.map(() => 'number'), args);
  }

  const direct = module[`_${name}`] || module[name];
  if (typeof direct !== 'function') {
    throw new Error(`Emscripten export not found: ${name}`);
  }

  return direct(...args);
}

async function waitForDevice(module) {
  callNumber(module, 'initializeWebGPUDevice');

  const start = performance.now();
  while (performance.now() - start < DEVICE_READY_TIMEOUT_MS) {
    if (callNumber(module, 'isWebGPUDeviceReady')) {
      return;
    }

    if (callNumber(module, 'hasWebGPUDeviceFailed')) {
      throw new Error('WASM WebGPU device creation failed');
    }

    await new Promise(resolve => setTimeout(resolve, 16));
  }

  throw new Error('Timed out waiting for WASM WebGPU device');
}

function normalizeGlobalBench(globalBench) {
  if (!globalBench) {
    return null;
  }

  if (typeof globalBench.runGenerativeShaderOverhead === 'function') {
    return {
      source: 'global',
      async runGenerativeShaderOverhead(numFrames = DEFAULT_NUM_FRAMES) {
        return globalBench.runGenerativeShaderOverhead(numFrames);
      }
    };
  }

  return null;
}

async function createModuleFromScript(scriptUrl) {
  await loadScriptOnce(scriptUrl);

  const factory = window.createWebGPUWasmBenchmark;
  if (typeof factory !== 'function') {
    throw new Error('createWebGPUWasmBenchmark factory was not registered');
  }

  const wasmUrl = scriptUrl.replace(/\.js$/, '.wasm');
  const module = await factory({
    locateFile(path) {
      return path.endsWith('.wasm') ? wasmUrl : path;
    }
  });

  await waitForDevice(module);

  return {
    source: scriptUrl,
    async runGenerativeShaderOverhead(numFrames = DEFAULT_NUM_FRAMES) {
      const fps = callNumber(module, 'runGenerativeShaderOverhead', [numFrames]);
      if (fps < 0) {
        throw new Error(`WASM WebGPU benchmark returned ${fps}`);
      }
      return fps;
    }
  };
}

export async function loadWebGPUWasmBench() {
  if (cachedBench) {
    return cachedBench;
  }

  const globalBench = normalizeGlobalBench(window.WebGPUWasmBench);
  if (globalBench) {
    cachedBench = globalBench;
    return cachedBench;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      for (const scriptUrl of candidateScripts) {
        if (!(await fileExists(scriptUrl))) {
          continue;
        }

        try {
          return await createModuleFromScript(scriptUrl);
        } catch (error) {
          console.warn(`Failed to initialize ${scriptUrl}:`, error);
        }
      }

      return null;
    })();
  }

  cachedBench = await loadPromise;
  return cachedBench;
}
