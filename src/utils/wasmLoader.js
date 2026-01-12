export async function loadWasmModule(configId) {
  try {
    let module;
    switch (configId) {
      case 'wasm_as':
      case 'wasm_asc_opt':
        // AssemblyScript (Emscripten-style)
        await checkFileExists('/benchmarks/physics/candy_physics.js');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/benchmarks/physics/candy_physics.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        if (!window.Module) throw new Error('AssemblyScript Module not loaded');
        module = window.Module;
        break;
      case 'wasm_rust':
        // Rust via wasm-pack
        try {
          // Check if file exists first to avoid 404/MIME issues
          // Note: wasm-pack usually outputs to a direct file or pkg dir.
          // Adjusting path to match typical output or verify existence.
          // If built via build.sh provided, it's likely just in the root of that dir.
          // Let's assume /benchmarks/rust/rust_benchmark.js based on build.sh
          const path = '/benchmarks/rust/rust_benchmark.js';
          await checkFileExists(path);
          const rustModule = await import(/* webpackIgnore: true */ path);
          module = await rustModule.default();
        } catch (e) {
          throw new Error(`Rust WASM not built or load failed: ${e.message}`);
        }
        break;
      case 'wasm_cheerp':
        // Cheerp (assume built to /benchmarks/cheerp/cheerp_benchmark.js)
        await checkFileExists('/benchmarks/cheerp/cheerp_benchmark.js');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/benchmarks/cheerp/cheerp_benchmark.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        if (!window.CheerpModule) throw new Error('Cheerp WASM not built');
        module = window.CheerpModule;
        break;
      case 'wasm_opt':
        // Optimized WASM (post-processed)
        module = await loadWasmModule('wasm_as'); // Base, then assume optimized loaded
        break;
      case 'wasmedge_aot':
        // AOT (simulated as optimized WASM)
        module = await loadWasmModule('wasm_opt');
        break;
      case 'wasm_openmp':
      case 'wasm_max':
      case 'wasm_threads':
      case 'wasm_simd':
        // Threaded via Emscripten
        await checkFileExists('/wasm/swarm.js');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = '/wasm/swarm.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        if (!window.Module) throw new Error('Threaded WASM Module not loaded');
        module = window.Module;
        break;
      default:
        throw new Error(`No loader for ${configId}`);
    }
    return module;
  } catch (error) {
    console.warn(`WASM load failed for ${configId}:`, error);
    throw error;
  }
}

// Helper to pre-check if file exists (avoids SyntaxError < caused by 404 returning HTML)
async function checkFileExists(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
        // Fallback to GET if HEAD fails (some servers deny HEAD)
        const getResponse = await fetch(url, { method: 'GET', range: 'bytes=0-0' });
        if (!getResponse.ok) throw new Error(`File not found: ${url}`);
        // Check content type to ensure it's not HTML (404 page)
        const type = getResponse.headers.get('content-type');
        if (type && type.includes('text/html')) throw new Error(`File is HTML (likely 404): ${url}`);
    } else {
         const type = response.headers.get('content-type');
         if (type && type.includes('text/html')) throw new Error(`File is HTML (likely 404): ${url}`);
    }
  } catch (e) {
    throw new Error(`Failed to locate WASM script ${url}: ${e.message}`);
  }
}
