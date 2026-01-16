export async function loadWasmModule(configId) {
  try {
    let module;
    switch (configId) {
      case 'wasm_as':
      case 'wasm_asc_opt':
        // AssemblyScript (ES Module)
        // Fix: Use dynamic import() instead of script tag to handle 'export' syntax
        const asPath = process.env.PUBLIC_URL + '/benchmarks/physics/candy_physics.js';
        await checkFileExists(asPath);
        module = await import(/* webpackIgnore: true */ asPath);
        break;

      case 'wasm_rust':
        // Rust via wasm-pack
        try {
          const path = process.env.PUBLIC_URL + '/benchmarks/rust/rust_benchmark.js';
          await checkFileExists(path);
          const rustModule = await import(/* webpackIgnore: true */ path);
          module = await rustModule.default();
        } catch (e) {
          throw new Error(`Rust WASM not built or load failed: ${e.message}`);
        }
        break;

      case 'wasm_cheerp':
        // Cheerp (C++)
        await checkFileExists(process.env.PUBLIC_URL + '/benchmarks/cheerp/cheerp_benchmark.js');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = process.env.PUBLIC_URL + '/benchmarks/cheerp/cheerp_benchmark.js';
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
        const swarmPath = process.env.PUBLIC_URL + '/wasm/swarm.js';
        await checkFileExists(swarmPath);

        // Fix: Check if script is ALREADY loaded to prevent "Identifier declared" errors
        if (!document.querySelector(`script[src="${swarmPath}"]`)) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = swarmPath;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Wait briefly for Module to initialize if it was just loaded or previously loaded
        if (!window.Module) {
             // Retry briefly or throw (Emscripten usually inits synchronously after script load unless -s MODULARIZE=1)
             throw new Error('Threaded WASM Module not loaded');
        }
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
