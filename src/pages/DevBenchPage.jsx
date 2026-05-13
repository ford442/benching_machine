import React from 'react';
import './DevBenchPage.css';
import BenchmarkRunner from '../components/BenchmarkRunner';
import HallwayVisualization from '../components/HallwayVisualization';
import { saveSnapshot } from '../utils/snapshotManager';

/**
 * DevBenchPage — Baseline Generation Mode
 *
 * Side-by-side benchmark runner + hallway visualization.
 * Includes an "Export Baseline JSON" button that downloads the
 * current benchmarkData as a snapshot file.
 */
function DevBenchPage({ benchmarkData, setBenchmarkData, isRunning, setIsRunning }) {
  const canExport = benchmarkData && benchmarkData.configurations && benchmarkData.configurations.length > 0;

  return (
    <div className="dev-bench-page">
      {/* Dev toolbar */}
      <div className="dev-toolbar">
        <div className="dev-toolbar-left">
          <h2>🛠️ Dev Mode</h2>
          <span className="dev-subtitle">
            Run live benchmarks, inspect compiler charts, and export baselines for playback.
          </span>
        </div>
        <div className="dev-toolbar-right">
          <button
            className="dev-btn export-btn"
            onClick={() => saveSnapshot(benchmarkData, true)}
            disabled={!canExport}
            title={canExport ? 'Download current results as JSON' : 'Run benchmarks first'}
          >
            💾 Export Baseline JSON
          </button>
          {canExport && (
            <span className="dev-status">
              {benchmarkData.configurations.length} configs •{' '}
              {new Date(benchmarkData.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Main dev layout: runner + visualization */}
      <div className="dev-layout">
        <BenchmarkRunner
          setBenchmarkData={setBenchmarkData}
          isRunning={isRunning}
          setIsRunning={setIsRunning}
        />
        <HallwayVisualization
          benchmarkData={benchmarkData}
          isRunning={isRunning}
        />
      </div>
    </div>
  );
}

export default DevBenchPage;
