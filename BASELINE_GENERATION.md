# Generating Baseline Benchmarks for Multi-VM Comparison

This guide explains how to generate baseline benchmark data on different virtual machines (CPU-only and GPU-enabled) and merge them into a single baseline file that users can load without running benchmarks themselves.

## Overview

Baseline benchmarks allow users to:
- View pre-computed results immediately without waiting for benchmarks to run
- Compare their local performance against known baselines
- Understand relative performance differences between compilation methods
- Test new hardware configurations without rebuilding the entire suite

## Prerequisites

1. **Two VMs** (or bare metal):
   - **VM1**: CPU-only (no GPU)
   - **VM2**: GPU-enabled (NVIDIA RTX 3080, RTX 4090, AMD RX 6700, etc.)

2. **Each VM must have**:
   - Node.js ≥ 18
   - All WASM toolchains installed (see `CLAUDE.md`)
   - Web browser for testing (Chrome 113+ for WebGPU, any for WebGL)

3. **Repository cloned and deps installed**:
   ```bash
   git clone <repo-url>
   cd benching_machine
   npm install
   npm run build:all-wasm  # Build WASM artifacts
   ```

## Step 1: Generate CPU-Only Baseline

**On CPU-only VM:**

```bash
# Start web UI
npm run web

# In browser: http://localhost:3000
# 1. Click "▶ Run Full Suite"
# 2. Wait 5–10 minutes for all benchmarks to complete
# 3. Results appear in hallway and chart views
# 4. (Optional) Click "Compare to Saved" to see delta vs last saved baseline
# 5. Click "💾 Save Results" button
# 6. Browser downloads "benchmark-snapshot-<timestamp>.json"
```

**Save the downloaded file**:
```bash
mv ~/Downloads/benchmark-snapshot-*.json ./baseline-cpu-vm.json
```

**Examine the file structure**:
```bash
jq '.configurations | length' baseline-cpu-vm.json  # Should show ~26 configs
jq '.configurations[0]' baseline-cpu-vm.json | head -20  # View first config
```

## Step 2: Generate GPU Baseline

**On GPU-enabled VM:**

```bash
# Start web UI
npm run web

# In browser: http://localhost:3000
# 1. Click "🎮 GPU Benchmarks"
# 2. Wait 2–3 minutes for GPU tests to complete
# 3. Results show GPU accelerated performance
# 4. Click "💾 Save Results"
# 5. Browser downloads "benchmark-snapshot-<timestamp>.json"
```

**Save the downloaded file**:
```bash
mv ~/Downloads/benchmark-snapshot-*.json ./baseline-gpu-vm.json
```

## Step 3: Merge Baselines (Dev Machine)

Transfer both files to your dev machine. Then:

```bash
# Merge the two baseline files
node scripts/merge-baselines.js \
  --cpu baseline-cpu-vm.json \
  --gpu baseline-gpu-vm.json \
  --output public/baseline-benchmarks.json
```

**If that script doesn't exist, do it manually:**

```bash
cat > merge_baselines.js << 'EOF'
const fs = require('fs');
const path = require('path');

const cpuData = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const gpuData = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));

const output = {
  baseline_cpu: {
    timestamp: cpuData.timestamp,
    metadata: {
      machine: 'Standard CPU (no GPU)',
      cpu: 'Intel i7/AMD Ryzen 7',
      ram: '16GB',
      os: 'Linux/macOS/Windows',
      notes: 'Baseline CPU-only performance for comparison'
    },
    configurations: cpuData.configurations
  },
  baseline_gpu: {
    timestamp: gpuData.timestamp,
    metadata: {
      machine: 'GPU-Enabled (NVIDIA RTX 3080 / AMD RX 6700)',
      cpu: 'Intel i7/AMD Ryzen 7',
      gpu: 'NVIDIA RTX 3080 or equivalent',
      ram: '16GB',
      os: 'Linux/Windows',
      notes: 'GPU-accelerated benchmark performance'
    },
    configurations: gpuData.configurations
  }
};

fs.writeFileSync(process.argv[4], JSON.stringify(output, null, 2));
console.log(`✓ Merged baselines into ${process.argv[4]}`);
EOF

node merge_baselines.js baseline-cpu-vm.json baseline-gpu-vm.json public/baseline-benchmarks.json
```

## Step 4: Verify & Commit

```bash
# Check the merged file
jq 'keys' public/baseline-benchmarks.json  # Should show ["baseline_cpu", "baseline_gpu"]

# Verify structure
jq '.baseline_cpu.metadata' public/baseline-benchmarks.json
jq '.baseline_gpu.metadata' public/baseline-benchmarks.json

# Commit
git add public/baseline-benchmarks.json
git commit -m "Update baseline benchmarks for CPU and GPU VMs ($(date +%Y-%m-%d))"
git push
```

## Step 5: Test in Web UI

After pushing, test that baselines load correctly:

```bash
npm run web
# In browser: http://localhost:3000
# 1. Click "💾 Load CPU Baseline"
#    → Should show all CPU-optimized results
# 2. Click "💾 Load GPU Baseline"
#    → Should show GPU-accelerated results (higher scores for GPU tasks)
```

## Interpreting Results

### CPU Baseline (baseline_cpu)
- **Best for**: Understanding relative compiler/toolchain efficiency
- **Example expected scores** (js_inline = 1.0×):
  - `js_inline`: 120k ops/sec
  - `wasm_rust`: 300k ops/sec (2.5×)
  - `wasm_openmp`: 312k ops/sec (4.3×)
  - `wasm_max`: 270k ops/sec (4.5×)

### GPU Baseline (baseline_gpu)
- **Best for**: Understanding GPU acceleration gains
- **Example expected scores**:
  - CPU configs: same as CPU baseline
  - `webgl_compute`: 360k ops/sec (8.0×)
  - `webgpu_compute` (Tiled): 2.5M ops/sec (12.0×)

## Automating Baseline Updates

For CI/CD pipelines, you can automate baseline generation:

### GitHub Actions Example
```yaml
name: Generate Baselines

on:
  schedule:
    # Monthly on first Monday
    - cron: '0 9 * * 1'

jobs:
  cpu:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install && npm run build:all-wasm
      - run: npx playwright install
      - run: |
          npm run web &
          sleep 3
          npx playwright codegen http://localhost:3000
      - uses: actions/upload-artifact@v3
        with:
          name: baseline-cpu
          path: baseline-*.json

  gpu:
    runs-on: ubuntu-latest
    # Requires GPU runner
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install && npm run build:all-wasm
      - run: |
          npm run web &
          npx playwright test gpu-baseline.spec.ts
      - uses: actions/upload-artifact@v3
        with:
          name: baseline-gpu
          path: baseline-*.json

  merge:
    needs: [cpu, gpu]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
      - run: |
          node merge_baselines.js \
            baseline-cpu/benchmark-snapshot-*.json \
            baseline-gpu/benchmark-snapshot-*.json \
            public/baseline-benchmarks.json
      - run: git commit -am "CI: Update baselines" && git push
```

## Troubleshooting

### Baseline load shows no results
- **Cause**: File format mismatch
- **Fix**: Verify JSON structure with `jq`, ensure `configurations` array is present

### GPU baseline has CPU-only results
- **Cause**: GPU tests didn't run (no GPU available or unsupported browser)
- **Fix**: Ensure browser supports WebGL2 or WebGPU; check console for errors

### WebGPU not running on GPU VM
- **Cause**: Browser too old (needs Chrome 113+) or GPU drivers outdated
- **Fix**: Update Chrome to latest; verify GPU drivers with `nvidia-smi`

### Baseline download button doesn't work
- **Cause**: Browser blocking download or localStorage full
- **Fix**: Clear browser cache; ensure sufficient localStorage quota

## Metrics to Track

For comparing baselines over time, track these key metrics:

| Metric | Formula | Interpretation |
|--------|---------|-----------------|
| **WASM Speedup** | `wasm_openmp.ops / js_inline.ops` | Should be ~4.3x on CPU |
| **GPU Speedup** | `webgpu_compute.ops / wasm_openmp.ops` | Should be ~2.8x on GPU |
| **Load Efficiency** | `startup.ops / prime_check.ops` | Compilation overhead ratio |
| **Threading Gain** | `wasm_threads.ops / wasm_rust.ops` | Threads benefit (1.1–1.5x) |
| **SIMD Gain** | `wasm_simd.ops / wasm_rust.ops` | Vector op benefit (~1.4x) |

## Next Steps

- **Monitor**: Schedule regular baseline updates (monthly/quarterly)
- **Regression**: Alert if new baseline deviates >10% from previous
- **Hardware**: Create baselines for different CPU/GPU combos
- **Compare**: Use snapshots to show performance improvements from compiler upgrades

---

**Questions?** See `BENCHMARKS_STATUS.md` for detailed config reference.
