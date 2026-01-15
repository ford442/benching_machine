import React from 'react';
import './Hallway3DView.css';

const getUnitImage = (id) => {
  if (id.includes('webgl') || id.includes('webgpu')) return '/design/rack_unit_gpu.png';
  if (id.includes('threads') || id.includes('openmp')) return '/design/rack_unit_cores.png';
  return '/design/rack_unit_std.png';
};

const Hallway3DView = ({ configs, onSelectUnit }) => {
  const depthStep = 300; // Distance between racks

  return (
    <div className="hallway-3d-container">
      <div className="hallway-scene">
        {configs.map((config, index) => {
          const bgImage = getUnitImage(config.id);
          const zPos = -index * depthStep;
          const zIndex = configs.length - index;
          const opacity = Math.max(0.4, 1 - (index / configs.length) * 0.8);

          // Calculate total score safely
          const score = config.tests ? config.tests.reduce((acc, t) => acc + t.opsPerSec, 0) : 0;

          return (
            <div
              key={config.id}
              className="rack-unit-3d-card"
              style={{
                backgroundImage: `url('${bgImage}')`,
                transform: `translateZ(${zPos}px)`,
                zIndex: zIndex,
                opacity: opacity
              }}
              onClick={() => onSelectUnit(config)}
            >
              <div className="rack-label-overlay">
                <span className="label-id">{config.id.toUpperCase()}</span>
                <span className="label-score">{score.toLocaleString()} OPS</span>
              </div>

              {/* Fake Floor Reflection */}
              <div className="rack-reflection" style={{ backgroundImage: `url('${bgImage}')` }}></div>
            </div>
          );
        })}
        {/* Floor Plane */}
        <div className="hallway-floor"></div>
      </div>
    </div>
  );
};

export default Hallway3DView;
