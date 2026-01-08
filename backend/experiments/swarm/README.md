Swarm PoC (Emscripten + WebGPU + pthreads)
==========================================

What is this?
-------------
A minimal "mad scientist" PoC that spawns multiple C++ threads where each thread requests its own WebGPU Device and runs a simple compute pass (demo: just acquiring the device and releasing it).

Why?
----
Modern browsers bind a single WebGPU Device to the JS realm that created it; you cannot share one Device across threads. This PoC demonstrates a multi-device approach ("Swarm") where each thread/worker independently creates a device.

Caveats / Requirements
----------------------
- You need Emscripten with WebGPU support. Install and activate emscripten via emsdk.
- The demo requires WebAssembly threads and WebGPU support in the browser.
- To use Web Workers + threads with WebGPU you often need COOP/COEP headers:
  - Cross-Origin-Opener-Policy: same-origin
  - Cross-Origin-Embedder-Policy: require-corp

  Example (Netlify _headers):

  /experiments/swarm/*
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp

  Example (nginx):

  location /experiments/swarm/ {
    add_header Cross-Origin-Opener-Policy "same-origin";
    add_header Cross-Origin-Embedder-Policy "require-corp";
    try_files $uri $uri/ =404;
  }

- You may need to run Chrome with experimental flags enabled (for some platforms):
  - chrome://flags -> enable "Unsafe WebGPU" (if available)
  - Ensure your browser exposes navigator.gpu inside Workers (behavior is experimental)

Build
-----
Make sure emcc is in your path (source emsdk_env.sh), then:

```bash
cd backend/experiments/swarm
chmod +x build.sh
./build.sh
```

This produces `dist/swarm.html`.

Run / Serve
-----------
You must serve with COOP/COEP headers (see above). If you host on Netlify or a similar static host, add the headers and deploy.

Visit the built page in a browser (open DevTools Console). Expected console output (if successful):

```
--- STARTING THE SWARM ---
[Thread 0] Spawning...
[Thread 1] Spawning...
[Thread 2] Spawning...
[Thread 3] Spawning...
[Thread 1] Acquired GPU Device!
[Thread 1] Running Compute Pass on my personal GPU Device...
[Thread 0] Acquired GPU Device!
...
--- SWARM FINISHED ---
```

If things fail, check DevTools console for messages:
- `navigator.gpu` may be undefined inside workers (blocked by browser security/fingerprinting protections)
- The browser may refuse multiple adapters/devices for the same origin

Notes / Next steps
------------------
- This is intentionally experimental — add real compute passes or buffer traffic to test synchronization strategies (map back to SharedArrayBuffer, etc.).
- If you'd like, I can add a GitHub Actions workflow to build this artifact on-demand (workflow_dispatch). Let me know and I'll add it.

License: MIT
