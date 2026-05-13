import React, { useState, useEffect, useRef, useMemo } from 'react';
import './UserBenchPage.css';
import Hallway3DView from '../components/Hallway3DView';
import { loadSnapshot, loadSnapshotFromFile, saveSnapshot } from '../utils/snapshotManager';
import { configSourceCode } from '../utils/configSourceCode';
import { machineProfileList, getMachineProfile } from '../utils/machineProfiles';
import { scaleBenchmarkData } from '../utils/scaleBenchmarkData';

const JS_BASELINE_ID = 'js_inline';
const PLAYBACK_DURATION_MS = 2500;

/**
 * UserBenchPage — Playback & Educational Mode
 *
 * Two viewing modes:
 *  1. Live Test      – mirrors the current benchmarkData from Dev mode.
 *  2. Baseline Playback – loads a saved snapshot from localStorage and
 *                         animates the racks so they "light up" progressively.
 *
 * Machine Profile selector:
 *  - Simulates cross-hardware performance by scaling opsPerSec values.
 *  - Native workloads for the selected hardware are highlighted with a
 *    cyan border pulse and "NATIVE" badge.
 *
 * Clicking any rack unit opens an educational detail panel with:
 *  - Source code for that toolchain
 *  - Recorded baseline metrics (avgOpsPerSec, avgTimeMs, runs)
 *  - A speed-difference badge vs the JS baseline
 */
function UserBenchPage({ benchmarkData }) {
  const [mode, setMode] = useState('live'); // 'live' | 'playback'
  const [playbackConfigs, setPlaybackConfigs] = useState([]);
  const [animProgress, setAnimProgress] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedProfileId, setSelectedProfileId] = useState('reference');
  const [showCompare, setShowCompare] = useState(false);
  const [importNotice, setImportNotice] = useState(null);

  const snapshotRef = useRef(null);
  const animFrameRef = useRef(null);

  const selectedProfile = getMachineProfile(selectedProfileId);
  const referenceProfile = getMachineProfile('reference');

  /* ───────────────────────── Playback animation ───────────────────────── */
  useEffect(() => {
    if (mode === 'playback') {
      const snapshot = loadSnapshot();
      if (snapshot && snapshot.configurations) {
        snapshotRef.current = snapshot;
        startPlaybackAnimation(snapshot.configurations);
      } else {
        snapshotRef.current = null;
        setPlaybackConfigs([]);
        setAnimProgress(0);
      }
    } else {
      stopPlaybackAnimation();
      setSelectedUnit(null);
    }
    return () => stopPlaybackAnimation();
  }, [mode]);

  const handleImport = async () => {
    try {
      const data = await loadSnapshotFromFile();
      if (data && data.configurations) {
        saveSnapshot(data);
        setImportNotice(`Imported ${data.configurations.length} configs`);
        setTimeout(() => setImportNotice(null), 3000);
        // If already in playback mode, restart with the new data
        if (mode === 'playback') {
          snapshotRef.current = data;
          startPlaybackAnimation(data.configurations);
        }
      }
    } catch (err) {
      console.warn('Import cancelled or failed:', err);
    }
  };

  const startPlaybackAnimation = (configurations) => {
    // Deep-clone so we can mutate opsPerSec for the tween
    const animated = JSON.parse(JSON.stringify(configurations));

    // Remember target values
    animated.forEach((c) => {
      if (c.tests) {
        c.tests.forEach((t) => {
          t._targetOps = t.opsPerSec || 0;
          t.opsPerSec = 0;
        });
      }
    });

    setPlaybackConfigs(animated);
    setAnimProgress(0);

    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / PLAYBACK_DURATION_MS, 1);
      // Ease-out cubic — fast start, gentle landing
      const eased = 1 - Math.pow(1 - progress, 3);

      animated.forEach((c) => {
        if (c.tests) {
          c.tests.forEach((t) => {
            t.opsPerSec = (t._targetOps || 0) * eased;
          });
        }
      });

      setPlaybackConfigs([...animated]);
      setAnimProgress(progress);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  const stopPlaybackAnimation = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  /* ─────────────────────── Active data source ─────────────────────────── */
  const rawConfigs = useMemo(() => {
    if (mode === 'live') {
      return benchmarkData ? benchmarkData.configurations : [];
    }
    return playbackConfigs;
  }, [mode, benchmarkData, playbackConfigs]);

  // Apply machine-profile scaling
  const activeConfigs = useMemo(() => {
    if (!selectedProfile || rawConfigs.length === 0) return rawConfigs;

    // Build a lightweight benchmarkData wrapper for the scaler
    const wrapper = { configurations: rawConfigs };
    const scaled = scaleBenchmarkData(wrapper, selectedProfile);
    return scaled.configurations;
  }, [rawConfigs, selectedProfile]);

  /* ─────────────────────── Detail-panel helpers ───────────────────────── */
  const handleSelectUnit = (animatedConfig) => {
    // Always show the *true* baseline numbers in the detail panel,
    // not the animated-in-progress values.
    let trueConfig = animatedConfig;
    if (mode === 'playback' && snapshotRef.current) {
      trueConfig =
        snapshotRef.current.configurations.find(
          (c) => c.id === animatedConfig.id
        ) || animatedConfig;
    } else if (mode === 'live' && benchmarkData) {
      trueConfig =
        benchmarkData.configurations.find(
          (c) => c.id === animatedConfig.id
        ) || animatedConfig;
    }
    setSelectedUnit(trueConfig);
  };

  const getBaselineConfig = (id) => {
    if (mode === 'playback' && snapshotRef.current) {
      return snapshotRef.current.configurations.find((c) => c.id === id);
    }
    if (mode === 'live' && benchmarkData) {
      return benchmarkData.configurations.find((c) => c.id === id);
    }
    return null;
  };

  const computeSpeedup = (config) => {
    const baseline = getBaselineConfig(JS_BASELINE_ID);
    if (!baseline || !config || !baseline.tests || !config.tests) return null;

    const sum = (tests) =>
      tests.reduce((s, t) => s + (t.avgOpsPerSec || t.opsPerSec || 0), 0);

    const baseScore = sum(baseline.tests);
    const targetScore = sum(config.tests);
    if (baseScore === 0) return null;
    return targetScore / baseScore;
  };

  /* ───────────── Side-by-side comparison data ─────────────────────────── */
  const compareConfigs = useMemo(() => {
    if (!showCompare || rawConfigs.length === 0) return [];
    const refWrapper = { configurations: JSON.parse(JSON.stringify(rawConfigs)) };
    const refScaled = scaleBenchmarkData(refWrapper, referenceProfile);
    return refScaled.configurations;
  }, [showCompare, rawConfigs, referenceProfile]);

  /* ───────────────────────────── Render ───────────────────────────────── */
  return (
    <div className="user-bench-page">
      {/* Top bar: mode toggle + machine profile */}
      <div className="user-bench-header">
        <div className="header-title-group">
          <h2>🔬 User Bench</h2>
          <span className="header-subline">
            {mode === 'live'
              ? 'Live benchmark data from Dev mode'
              : 'Playback of last saved baseline'}
          </span>
        </div>

        <div className="header-controls">
          {/* Import baseline */}
          <button
            className="import-btn"
            onClick={handleImport}
            title="Load a previously exported baseline JSON"
          >
            📂 Import Baseline
          </button>

          {/* Mode toggle */}
          <div className="mode-toggle">
            <button
              className={mode === 'live' ? 'active' : ''}
              onClick={() => setMode('live')}
              title="Show current live benchmark results"
            >
              ⚡ Live
            </button>
            <button
              className={mode === 'playback' ? 'active' : ''}
              onClick={() => setMode('playback')}
              title="Replay saved baseline snapshot"
            >
              ▶ Playback
            </button>
          </div>

          {/* Machine profile selector */}
          <div className="profile-selector">
            <label htmlFor="machine-profile">Hardware:</label>
            <select
              id="machine-profile"
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              title={selectedProfile.description}
            >
              {machineProfileList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.multiplier}×)
                </option>
              ))}
            </select>
          </div>

          {/* Compare toggle */}
          <button
            className={`compare-toggle ${showCompare ? 'active' : ''}`}
            onClick={() => setShowCompare((v) => !v)}
            title="Show reference profile side-by-side"
          >
            {showCompare ? '◫ Hide Compare' : '◫ Compare vs Ref'}
          </button>
        </div>
      </div>

      {/* Import notice toast */}
      {importNotice && (
        <div className="import-notice">
          <span>✓ {importNotice}</span>
        </div>
      )}

      {/* Profile info strip */}
      {selectedProfile && (
        <div className="profile-info-strip">
          <span className="profile-name">{selectedProfile.name}</span>
          <span className="profile-desc">{selectedProfile.description}</span>
          <span className="profile-badge">
            Native: {selectedProfile.nativeFamily.toUpperCase()}
          </span>
        </div>
      )}

      {/* Playback progress bar */}
      {mode === 'playback' && playbackConfigs.length > 0 && (
        <div className="playback-progress-track">
          <div
            className="playback-progress-fill"
            style={{ width: `${animProgress * 100}%` }}
          />
          <span className="playback-progress-label">
            {animProgress < 1 ? 'Replaying baseline…' : 'Playback complete'}
          </span>
        </div>
      )}

      {/* Main hallway area */}
      <div className="user-bench-content">
        {mode === 'playback' && playbackConfigs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💾</div>
            <h3>No Baseline Snapshot Found</h3>
            <p>
              Switch to <strong>Dev mode</strong>, run the benchmark suite, and
              click <strong>“Save Results”</strong> to create a playback.
            </p>
          </div>
        )}

        {mode === 'live' && activeConfigs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <h3>No Live Data</h3>
            <p>
              Switch to <strong>Dev mode</strong> and run benchmarks to populate
              live results here.
            </p>
          </div>
        )}

        {activeConfigs.length > 0 && (
          <div
            className={`hallway-layout ${
              showCompare ? 'hallway-layout-split' : ''
            }`}
          >
            {/* Primary view (selected profile) */}
            <div className="hallway-pane primary">
              {showCompare && (
                <div className="pane-label active-profile">
                  {selectedProfile.name}
                </div>
              )}
              <div className="hallway-wrapper">
                <Hallway3DView
                  configs={activeConfigs}
                  onSelectUnit={handleSelectUnit}
                  activeProfile={selectedProfile}
                />
              </div>
            </div>

            {/* Side-by-side reference view */}
            {showCompare && (
              <div className="hallway-pane reference">
                <div className="pane-label">Reference Workstation</div>
                <div className="hallway-wrapper">
                  <Hallway3DView
                    configs={compareConfigs}
                    onSelectUnit={handleSelectUnit}
                    activeProfile={referenceProfile}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Educational detail panel (modal) */}
      {selectedUnit && (
        <div
          className="playback-detail-overlay"
          onClick={() => setSelectedUnit(null)}
        >
          <div
            className="playback-detail-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <header className="detail-header">
              <div className="detail-header-left">
                <h3>{selectedUnit.name}</h3>
                <span className="detail-id">ID: {selectedUnit.id}</span>
              </div>
              <button
                className="detail-close-btn"
                onClick={() => setSelectedUnit(null)}
                aria-label="Close detail panel"
              >
                ✕
              </button>
            </header>

            {/* Body */}
            <div className="detail-body">
              {/* Meta chips */}
              <section className="detail-section">
                <h4>Toolchain</h4>
                <div className="detail-chips">
                  <span
                    className="chip chip-lang"
                    style={{ backgroundColor: selectedUnit.color }}
                  >
                    {selectedUnit.compilation.language}
                  </span>
                  <span className="chip">
                    {selectedUnit.compilation.toolchain}
                  </span>
                  <span className="chip">
                    {selectedUnit.compilation.optLevel}
                  </span>
                  <span
                    className={`chip chip-status ${selectedUnit.compilation.status}`}
                  >
                    {selectedUnit.compilation.status}
                  </span>
                </div>
              </section>

              {/* Baseline metrics */}
              {selectedUnit.tests && selectedUnit.tests.length > 0 && (
                <section className="detail-section">
                  <h4>Baseline Metrics</h4>
                  <div className="metrics-grid">
                    {selectedUnit.tests.map((test, idx) => (
                      <div className="metric-card" key={idx}>
                        <span className="metric-name">{test.name}</span>
                        <div className="metric-row">
                          <span className="metric-big">
                            {Math.round(
                              test.avgOpsPerSec || test.opsPerSec || 0
                            ).toLocaleString()}
                          </span>
                          <span className="metric-unit">ops/s</span>
                        </div>
                        <div className="metric-row secondary">
                          <span className="metric-small">
                            {(test.avgTimeMs || 0).toFixed(2)} ms/run
                          </span>
                          <span className="metric-small">
                            {test.runs || 1} run{test.runs !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Speed comparison */}
              {(() => {
                const speedup = computeSpeedup(selectedUnit);
                if (speedup === null) return null;
                const isFaster = speedup >= 1;
                return (
                  <section className="detail-section">
                    <h4>Simulated Speed Difference</h4>
                    <div
                      className={`speedup-card ${isFaster ? 'fast' : 'slow'}`}
                    >
                      <span className="speedup-number">
                        {speedup.toFixed(2)}×
                      </span>
                      <span className="speedup-desc">
                        {isFaster ? 'faster than' : 'slower than'} the{' '}
                        <strong>JS baseline</strong>
                      </span>
                    </div>
                    <p className="speedup-hint">
                      Based on aggregated ops/sec across all tests for this
                      configuration.
                    </p>
                  </section>
                );
              })()}

              {/* Source code */}
              <section className="detail-section">
                <h4>Source Code</h4>
                <div className="source-panel">
                  <pre className="source-pre">
                    <code>
                      {configSourceCode[selectedUnit.id] ||
                        '// No source snippet available for this configuration.'}
                    </code>
                  </pre>
                </div>
              </section>

              {/* Compilation flags */}
              {selectedUnit.compilation.flags.length > 0 && (
                <section className="detail-section">
                  <h4>Compiler Flags</h4>
                  <ul className="flags-list">
                    {selectedUnit.compilation.flags.map((f, i) => (
                      <li key={i}>
                        <code>{f}</code>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserBenchPage;
