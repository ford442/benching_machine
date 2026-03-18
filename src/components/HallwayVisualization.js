import React, { useState } from 'react';
import './HallwayVisualization.css';
import Hallway3DView from './Hallway3DView';
import RackUnitDetail from './RackUnitDetail';
import CompilerComparisonView from './CompilerComparisonView';

function HallwayVisualization({ benchmarkData }) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [viewMode, setViewMode] = useState('hallway'); // 'hallway' | 'comparison'

  // Fallback if data hasn't loaded yet
  const configs = benchmarkData ? benchmarkData.configurations : [];

  return (
    <div className="hallway-visualization">
      {/* View Controls Header */}
      <div className="view-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ color: '#fff', fontSize: '0.75rem', opacity: 0.5, letterSpacing: '0.08em' }}>
          VIEW:
        </span>
        <button
          onClick={() => { setViewMode('hallway'); setSelectedUnit(null); }}
          style={{
            padding: '4px 12px',
            fontFamily: 'Courier New, monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            background: viewMode === 'hallway' ? 'rgba(0,212,255,0.12)' : '#111',
            border: viewMode === 'hallway' ? '1px solid #00d4ff' : '1px solid #333',
            color: viewMode === 'hallway' ? '#00d4ff' : '#888',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
        >
          Server Room
        </button>
        <button
          onClick={() => { setViewMode('comparison'); setSelectedUnit(null); }}
          style={{
            padding: '4px 12px',
            fontFamily: 'Courier New, monospace',
            fontSize: '0.75rem',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            background: viewMode === 'comparison' ? 'rgba(0,212,255,0.12)' : '#111',
            border: viewMode === 'comparison' ? '1px solid #00d4ff' : '1px solid #333',
            color: viewMode === 'comparison' ? '#00d4ff' : '#888',
            textTransform: 'uppercase',
            transition: 'all 0.15s',
          }}
        >
          Compiler Charts
        </button>
      </div>

      <div className="canvas-container" style={{ position: 'relative', overflow: viewMode === 'comparison' ? 'auto' : 'hidden' }}>

        {/* ── Hallway / Server Room view ── */}
        {viewMode === 'hallway' && !selectedUnit && (
          <Hallway3DView
            configs={configs}
            onSelectUnit={(config) => setSelectedUnit(config)}
          />
        )}

        {viewMode === 'hallway' && selectedUnit && (
          <RackUnitDetail
            config={selectedUnit}
            onExit={() => setSelectedUnit(null)}
          />
        )}

        {/* ── Compiler comparison charts view ── */}
        {viewMode === 'comparison' && (
          <CompilerComparisonView benchmarkData={benchmarkData} />
        )}

      </div>

      <div className="future-note">
        {configs.length} Units Online
        {viewMode === 'hallway' ? ' • Click a unit to inspect' : ' • Compiler Charts: Grouped Bars | Speedup | Pipeline | Heatmap'}
      </div>
    </div>
  );
}

export default HallwayVisualization;
