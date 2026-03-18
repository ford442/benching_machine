import React, { useState, useMemo } from 'react';
import './CompilerComparisonView.css';
import { saveSnapshot, loadSnapshot, diffSnapshots } from '../utils/snapshotManager';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtOps(n) {
  if (!n || n === 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return String(Math.round(n));
}

// Average ops/sec across all tests for a config
function avgOps(config) {
  if (!config.tests || config.tests.length === 0) return 0;
  return config.tests.reduce((s, t) => s + (t.opsPerSec || 0), 0) / config.tests.length;
}

// All unique test names across all configs, ordered by frequency
function collectTestNames(configs) {
  const counts = {};
  configs.forEach(c => (c.tests || []).forEach(t => {
    counts[t.name] = (counts[t.name] || 0) + 1;
  }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name]) => name);
}

// Family sort order so charts flow: js → wasm → gpu
const FAMILY_ORDER = { js: 0, wasm: 1, gpu: 2 };

function sortedByFamily(configs) {
  return [...configs].sort((a, b) => {
    const fa = FAMILY_ORDER[a.compilation?.family] ?? 9;
    const fb = FAMILY_ORDER[b.compilation?.family] ?? 9;
    return fa !== fb ? fa - fb : a.name.localeCompare(b.name);
  });
}

// Colour with opacity
function colorAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Chart A: Grouped bars per test ───────────────────────────────────────────

function ChartGroupedBars({ configs, diff }) {
  const testNames = useMemo(() => collectTestNames(configs), [configs]);
  const activeConfigs = configs.filter(c => c.tests && c.tests.length > 0);

  if (activeConfigs.length === 0) {
    return <div className="empty-state">Run benchmarks to populate charts.<br/>Click "▶ Run Full Suite" in the left panel.</div>;
  }

  return (
    <div className="grouped-chart">
      {testNames.map(testName => {
        // Gather all (config, ops) pairs for this test
        const rows = activeConfigs.map(c => {
          const test = c.tests.find(t => t.name === testName);
          return { config: c, ops: test ? test.opsPerSec : null };
        }).filter(r => r.ops !== null);

        if (rows.length === 0) return null;
        const maxOps = Math.max(...rows.map(r => r.ops));

        return (
          <div key={testName} className="test-group">
            <div className="test-group-label">{testName}</div>
            <div className="bar-rows">
              {rows.map(({ config, ops }) => {
                const pct = maxOps > 0 ? (ops / maxOps) * 100 : 0;
                const delta = diff?.[config.id]?.[testName];
                return (
                  <div key={config.id} className="bar-row">
                    <div className="bar-label" title={config.compilation?.toolchain}>
                      {config.name}
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${pct}%`, background: colorAlpha(config.color || '#888', 0.8) }}
                      >
                        <span className="bar-value">
                          {fmtOps(ops)}
                          {delta != null && (
                            <span className={`delta-badge ${delta.pct >= 0 ? 'up' : 'down'}`}>
                              {delta.pct >= 0 ? '+' : ''}{delta.pct.toFixed(1)}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart B: Speedup over js_inline baseline ─────────────────────────────────

function ChartSpeedup({ configs, diff }) {
  const activeConfigs = configs.filter(c => c.tests && c.tests.length > 0);
  const baseline = activeConfigs.find(c => c.id === 'js_inline');
  const baselineOps = baseline ? avgOps(baseline) : null;

  if (activeConfigs.length === 0) {
    return <div className="empty-state">Run benchmarks to see speedup vs js_inline baseline.</div>;
  }

  const sorted = sortedByFamily(activeConfigs).sort((a, b) => avgOps(b) - avgOps(a));
  const maxMultiplier = sorted.length > 0 ? (avgOps(sorted[0]) / (baselineOps || 1)) : 1;

  let lastFamily = null;

  return (
    <div className="speedup-chart">
      {sorted.map(config => {
        const ops = avgOps(config);
        const multiplier = baselineOps ? ops / baselineOps : 1;
        const pct = maxMultiplier > 0 ? (multiplier / maxMultiplier) * 100 : 0;
        const baselinePct = maxMultiplier > 0 ? (1 / maxMultiplier) * 100 : 0;
        const family = config.compilation?.family ?? 'js';
        const showDivider = family !== lastFamily;
        lastFamily = family;

        const delta = diff?.[config.id]?.['__avg__'];

        return (
          <React.Fragment key={config.id}>
            {showDivider && <div className="family-divider" title={`family: ${family}`} />}
            <div className="speedup-row">
              <div className="speedup-label" title={config.compilation?.toolchain}>
                {config.name}
              </div>
              <div className="speedup-track">
                <div
                  className="speedup-fill"
                  style={{ width: `${pct}%`, background: colorAlpha(config.color || '#888', 0.75) }}
                />
                {/* 1× baseline tick */}
                <div className="baseline-tick" style={{ left: `${baselinePct}%` }} />
                <span className="speedup-value">
                  {multiplier.toFixed(2)}×
                  {delta != null && (
                    <span className={`delta-badge ${delta.pct >= 0 ? 'up' : 'down'}`}>
                      {delta.pct >= 0 ? '+' : ''}{delta.pct.toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ fontSize: '0.65rem', color: '#444', marginTop: 6 }}>
        Vertical tick = 1.0× (js_inline baseline). Grouped by family: js → wasm → gpu.
      </div>
    </div>
  );
}

// ── Chart C: Pipeline Waterfall ───────────────────────────────────────────────
// Shows multi-stage compilation pipelines: baseline → optimizer → AOT

function buildPipelines(configs) {
  const active = configs.filter(c => c.tests && c.tests.length > 0);

  const pipelines = [];

  // Pipeline 1: JS optimizers (inline → terser/closure/esbuild/swc)
  const jsBase = active.find(c => c.id === 'js_inline');
  const jsOptimizerIds = ['js_terser', 'js_closure', 'js_esbuild', 'js_swc'];
  const jsOptimizers = jsOptimizerIds.map(id => active.find(c => c.id === id)).filter(Boolean);
  if (jsBase && jsOptimizers.length > 0) {
    pipelines.push({
      label: 'JS Optimization Pipeline  (js_inline → minifier/optimizer)',
      steps: [
        { label: 'JS Inline (baseline)', config: jsBase, ops: avgOps(jsBase) },
        ...jsOptimizers.map(c => ({ label: c.name, config: c, ops: avgOps(c) })),
      ],
    });
  }

  // Pipeline 2: WASM C/C++ optimization stack (emcc → SIMD → Threads → Max)
  const emccBase = active.find(c => c.id === 'wasm_emcc') || active.find(c => c.id === 'wasm_rust');
  const wasmSteps = ['wasm_simd', 'wasm_threads', 'wasm_openmp', 'wasm_max']
    .map(id => active.find(c => c.id === id)).filter(Boolean);
  if (emccBase && wasmSteps.length > 0) {
    pipelines.push({
      label: 'WASM C/C++ Feature Pipeline  (emcc scalar → SIMD → Threads → Max)',
      steps: [
        { label: emccBase.name + ' (scalar)', config: emccBase, ops: avgOps(emccBase) },
        ...wasmSteps.map(c => ({ label: c.name, config: c, ops: avgOps(c) })),
      ],
    });
  }

  // Pipeline 3: AssemblyScript post-processing (Base → wasm-opt → WasmEdge AOT)
  const asConfig = active.find(c => c.id === 'wasm_as');
  if (asConfig && asConfig.tests && asConfig.tests.length >= 1) {
    const baseTest    = asConfig.tests.find(t => t.name.includes('Base') || t.name.includes('Fibonacci (Base)'));
    const optTest     = asConfig.tests.find(t => t.name.includes('wasm-opt'));
    const aotTest     = asConfig.tests.find(t => t.name.includes('AOT'));

    if (baseTest) {
      const steps = [
        { label: 'asc (base output)', config: asConfig, ops: baseTest.opsPerSec },
      ];
      if (optTest)  steps.push({ label: '+ wasm-opt -O3',   config: asConfig, ops: optTest.opsPerSec });
      if (aotTest)  steps.push({ label: '+ WasmEdge AOT',   config: asConfig, ops: aotTest.opsPerSec });

      if (steps.length > 1) {
        pipelines.push({
          label: 'AssemblyScript Post-Processing Pipeline  (asc → wasm-opt → WasmEdge AOT)',
          steps,
        });
      }
    }
  }

  return pipelines;
}

function ChartWaterfall({ configs }) {
  const pipelines = useMemo(() => buildPipelines(configs), [configs]);

  if (pipelines.length === 0) {
    return (
      <div className="empty-state">
        Run benchmarks to see pipeline waterfall.<br />
        Needs at least js_inline + one optimizer, or wasm_as with optimizer sub-bars.
      </div>
    );
  }

  return (
    <div className="waterfall-chart">
      {pipelines.map((pipeline, pi) => {
        const maxOps = Math.max(...pipeline.steps.map(s => s.ops));
        return (
          <div key={pi} className="waterfall-group">
            <div className="waterfall-group-label">{pipeline.label}</div>
            <div className="waterfall-rows">
              {pipeline.steps.map((step, si) => {
                const pct = maxOps > 0 ? (step.ops / maxOps) * 100 : 0;
                const prev = si > 0 ? pipeline.steps[si - 1].ops : null;
                const gainPct = prev && prev > 0 ? ((step.ops - prev) / prev) * 100 : null;
                return (
                  <div key={si} className="waterfall-row">
                    <div className="waterfall-step-label">{step.label}</div>
                    <div className="waterfall-track">
                      <div
                        className="waterfall-fill"
                        style={{
                          width: `${pct}%`,
                          background: colorAlpha(step.config.color || '#888', si === 0 ? 0.45 : 0.8),
                        }}
                      />
                      <span className="waterfall-gain">
                        {fmtOps(step.ops)}
                        {gainPct != null && (
                          <span style={{ color: gainPct >= 0 ? '#2ecc71' : '#e74c3c', marginLeft: 4 }}>
                            {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(1)}%
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart D: Heatmap (compiler × test) ───────────────────────────────────────

function heatColor(pct) {
  // 0% = dark → 100% = config accent colour via a blue-cyan ramp
  const v = Math.round(pct * 2.55);
  return `rgb(${Math.round(v * 0.1)}, ${Math.round(v * 0.5)}, ${v})`;
}

function ChartHeatmap({ configs }) {
  const activeConfigs = configs.filter(c => c.tests && c.tests.length > 0);
  const testNames = useMemo(() => collectTestNames(activeConfigs), [activeConfigs]);
  const orderedConfigs = useMemo(() => sortedByFamily(activeConfigs), [activeConfigs]);

  if (activeConfigs.length === 0) {
    return <div className="empty-state">Run benchmarks to populate the heatmap.</div>;
  }

  // Best per test column (max ops/sec across all configs for that test)
  const colMax = {};
  testNames.forEach(name => {
    colMax[name] = Math.max(
      ...activeConfigs.map(c => {
        const t = c.tests.find(tt => tt.name === name);
        return t ? t.opsPerSec : 0;
      })
    );
  });

  const cols = testNames.length + 1; // +1 for row label
  const gridStyle = {
    gridTemplateColumns: `180px repeat(${testNames.length}, 60px)`,
  };

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-grid" style={gridStyle}>
        {/* Header row */}
        <div className="heatmap-corner" />
        {testNames.map(name => (
          <div key={name} className="heatmap-col-label" title={name}>{name}</div>
        ))}

        {/* Data rows */}
        {orderedConfigs.map(config => (
          <React.Fragment key={config.id}>
            <div className="heatmap-row-label" title={config.compilation?.toolchain}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: config.color, display: 'inline-block', marginRight: 6, flexShrink: 0 }} />
              {config.name}
            </div>
            {testNames.map(testName => {
              const test = config.tests.find(t => t.name === testName);
              const ops = test ? test.opsPerSec : null;
              const pct = ops != null && colMax[testName] > 0 ? (ops / colMax[testName]) * 100 : 0;
              return (
                <div
                  key={testName}
                  className="heatmap-cell"
                  style={{ background: ops != null ? heatColor(pct) : '#0a0a0f' }}
                >
                  {ops != null ? `${Math.round(pct)}%` : '—'}
                  <div className="cell-tooltip">
                    {config.name} / {testName}<br />
                    {fmtOps(ops)} ops/s ({Math.round(pct)}% of best)
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="heatmap-legend">
        <span>0%</span>
        <div className="legend-gradient" />
        <span>100% (best)</span>
        <span style={{ marginLeft: 16 }}>Cells show % of column best. Hover for absolute value.</span>
      </div>
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

const CHARTS = [
  { id: 'grouped',   label: 'Grouped Bars'      },
  { id: 'speedup',   label: 'Speedup vs Baseline' },
  { id: 'waterfall', label: 'Pipeline Waterfall' },
  { id: 'heatmap',   label: 'Compiler Heatmap'  },
];

function CompilerComparisonView({ benchmarkData }) {
  const [activeChart, setActiveChart] = useState('grouped');
  const [snapshot, setSnapshot] = useState(() => loadSnapshot());

  const configs = benchmarkData?.configurations ?? [];

  const diff = useMemo(() => {
    if (!snapshot || configs.length === 0) return null;
    return diffSnapshots(snapshot.configurations, configs);
  }, [snapshot, configs]);

  const hasSnapshot = snapshot !== null;

  function handleSave() {
    if (!benchmarkData) return;
    saveSnapshot(benchmarkData);
    setSnapshot(loadSnapshot());
  }

  function handleClear() {
    localStorage.removeItem('benching_machine_snapshot');
    setSnapshot(null);
  }

  return (
    <div className="compiler-comparison">
      {/* Chart type tabs */}
      <div className="chart-tabs">
        {CHARTS.map(c => (
          <button
            key={c.id}
            className={`chart-tab ${activeChart === c.id ? 'active' : ''}`}
            onClick={() => setActiveChart(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Snapshot toolbar */}
      <div className="snapshot-toolbar">
        <button className="snap-btn" onClick={handleSave} disabled={configs.length === 0}>
          Save Results
        </button>
        {hasSnapshot && (
          <>
            <button className={`snap-btn has-snap`} onClick={handleClear}>
              Clear Baseline
            </button>
            <span className="snap-label">
              Baseline: {new Date(snapshot.timestamp).toLocaleString()} — deltas shown in charts
            </span>
          </>
        )}
        {!hasSnapshot && (
          <span className="snap-label">Save results as a baseline to track changes when compilers upgrade.</span>
        )}
      </div>

      {/* Active chart */}
      {activeChart === 'grouped'   && <div className="chart-section"><div className="chart-title">Performance by Test — one group per test, one bar per compiler</div><ChartGroupedBars configs={configs} diff={diff} /></div>}
      {activeChart === 'speedup'   && <div className="chart-section"><div className="chart-title">Speedup vs js_inline (1.0× baseline) — avg across all tests</div><ChartSpeedup configs={configs} diff={diff} /></div>}
      {activeChart === 'waterfall' && <div className="chart-section"><div className="chart-title">Compilation Pipeline Gains — each step's contribution</div><ChartWaterfall configs={configs} /></div>}
      {activeChart === 'heatmap'   && <div className="chart-section"><div className="chart-title">Compiler × Test Heatmap — % of best-in-column per cell</div><ChartHeatmap configs={configs} /></div>}
    </div>
  );
}

export default CompilerComparisonView;
