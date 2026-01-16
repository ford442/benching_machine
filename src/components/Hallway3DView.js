import React from 'react';
import './Hallway3DView.css';

const getUnitImage = (id) => {
  if (id.includes('webgl') || id.includes('webgpu')) return '/design/rack_unit_gpu.png';
  if (id.includes('threads') || id.includes('openmp') || id === 'wasm_max') return '/design/rack_unit_cores.png';
  return '/design/rack_unit_std.png';
};

const UNITS_PER_RACK = 8;

const Hallway3DView = ({ configs, onSelectUnit }) => {
  // 1. Group Configurations
  const groups = {
    standard: [],
    threaded: [],
    gpu: []
  };

  configs.forEach(config => {
    if (config.id.includes('webgl') || config.id.includes('webgpu')) {
      groups.gpu.push(config);
    } else if (config.id.includes('threads') || config.id.includes('openmp') || config.id === 'wasm_max') {
      groups.threaded.push(config);
    } else {
      groups.standard.push(config);
    }
  });

  // 2. Helper to create columns (racks) from a group
  const createRacks = (items, typeLabel) => {
    const racks = [];
    for (let i = 0; i < items.length; i += UNITS_PER_RACK) {
      racks.push({
        label: `${typeLabel} ${Math.floor(i / UNITS_PER_RACK) + 1}`,
        items: items.slice(i, i + UNITS_PER_RACK)
      });
    }
    return racks;
  };

  const allRacks = [
    ...createRacks(groups.standard, 'STD COMPUTE'),
    ...createRacks(groups.threaded, 'MULTI-CORE'),
    ...createRacks(groups.gpu, 'GPU CLUSTER')
  ];

  return (
    <div className="server-room-container">
      <div className="rack-row">
        {allRacks.map((rack, rackIndex) => (
          <div key={rackIndex} className="rack-column">
            <div className="rack-header">
              <div className="rack-header-text">{rack.label}</div>
              <div className="rack-lights">
                <span className="light red"></span>
                <span className="light green"></span>
              </div>
            </div>

            <div className="rack-stack">
              {rack.items.map((config) => {
                const bgImage = getUnitImage(config.id);
                // Calculate total score safely
                const score = config.tests ? config.tests.reduce((acc, t) => acc + t.opsPerSec, 0) : 0;

                return (
                  <div
                    key={config.id}
                    className="rack-unit-item"
                    style={{ backgroundImage: `url('${bgImage}')` }}
                    onClick={() => onSelectUnit(config)}
                  >
                    <div className="unit-status-light"></div>
                    <div className="rack-label-overlay">
                      <span className="label-id">{config.id.toUpperCase()}</span>
                      <span className="label-score">{score > 0 ? `${Math.round(score).toLocaleString()} OPS` : 'OFFLINE'}</span>
                    </div>
                  </div>
                );
              })}

              {/* Fill empty slots in the rack with placeholders if it's the last one?
                  Optional: leave empty space. The CSS will handle it.
              */}
            </div>

            <div className="rack-footer">
              :: SYSTEM ONLINE ::
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Hallway3DView;
