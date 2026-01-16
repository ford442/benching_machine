import React, { useState } from 'react';
import './HallwayVisualization.css';
import Hallway3DView from './Hallway3DView';
import RackUnitDetail from './RackUnitDetail';

function HallwayVisualization({ benchmarkData }) {
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Fallback if data hasn't loaded yet
  const configs = benchmarkData ? benchmarkData.configurations : [];

  return (
    <div className="hallway-visualization">
      {/* View Controls Header */}
      <div className="view-controls">
        <span style={{color: '#fff', fontSize: '0.9rem', opacity: 0.7}}>
          VISUALIZATION MODE: <strong>SERVER ROOM</strong>
        </span>
      </div>

      <div className="canvas-container" style={{ position: 'relative', overflow: 'hidden' }}>

        {/* 1. If NO unit is selected, show the 3D Hallway */}
        {!selectedUnit && (
          <Hallway3DView
            configs={configs}
            onSelectUnit={(config) => setSelectedUnit(config)}
          />
        )}

        {/* 2. If a unit IS selected, show the Zoomed Detail View */}
        {selectedUnit && (
          <RackUnitDetail
            config={selectedUnit}
            onExit={() => setSelectedUnit(null)}
          />
        )}

      </div>

      <div className="future-note">
        {configs.length} Units Online • Click a unit to inspect
      </div>
    </div>
  );
}

export default HallwayVisualization;
