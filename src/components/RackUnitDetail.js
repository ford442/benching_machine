import React, { useState, useEffect } from 'react';
import './RackUnitDetail.css';

// Helper to choose the right background image based on config ID
const getUnitBackground = (id) => {
  if (id.includes('webgl') || id.includes('webgpu')) return process.env.PUBLIC_URL + '/design/rack_unit_gpu.png';
  if (id.includes('threads') || id.includes('openmp')) return process.env.PUBLIC_URL + '/design/rack_unit_cores.png';
  return process.env.PUBLIC_URL + '/design/rack_unit_std.png'; // Default standard unit
};

// Helper to apply specific CSS class for alignment
const getUnitClass = (id) => {
  if (id.includes('webgl') || id.includes('webgpu')) return 'unit-style-gpu';
  if (id.includes('threads') || id.includes('openmp')) return 'unit-style-cores';
  return 'unit-style-std';
};

const RackUnitDetail = ({ config, onExit }) => {
  const [activeTab, setActiveTab] = useState('monitor');
  const [liveOps, setLiveOps] = useState(0);
  const [sliderValue, setSliderValue] = useState(50);

  useEffect(() => {
    // Simulate real-time data fluctuation
    const interval = setInterval(() => {
      const baseScore = config.tests ? config.tests.reduce((acc, t) => acc + t.opsPerSec, 0) : 0;
      const noise = (Math.random() - 0.5) * (baseScore * 0.05);
      setLiveOps(Math.floor(baseScore + noise));
    }, 100);
    return () => clearInterval(interval);
  }, [config]);

  const bgImage = getUnitBackground(config.id);
  const unitClass = getUnitClass(config.id);

  return (
    <div className="rack-overlay-backdrop">
      <div
        className={`rack-unit-frame ${unitClass}`}
        style={{ backgroundImage: `url('${bgImage}')` }}
      >
        {/* The Screen Interface Area */}
        <div className="rack-screen-interface">
          <header className="screen-header">
            <div className="header-left">
              <h3>{config.name.toUpperCase()}</h3>
              <span className="unit-id">ID: {config.id}</span>
            </div>
            <button className="close-btn" onClick={onExit}>⏏ EJECT</button>
          </header>

          <div className="screen-body">
            <div className="screen-tabs">
              <button className={activeTab === 'monitor' ? 'active' : ''} onClick={() => setActiveTab('monitor')}>MONITOR</button>
              <button className={activeTab === 'control' ? 'active' : ''} onClick={() => setActiveTab('control')}>CONTROLS</button>
            </div>

            <div className="screen-content">
              {activeTab === 'monitor' && (
                <div className="monitor-view">
                  <div className="big-stat">
                    <span className="stat-label">TOTAL THROUGHPUT</span>
                    <span className="stat-value text-glow">{liveOps.toLocaleString()}</span>
                    <span className="stat-unit">OPS/SEC</span>
                  </div>
                  <div className="mini-graph-placeholder">[ LIVE GRAPH FEED ]</div>
                </div>
              )}

              {activeTab === 'control' && (
                <div className="control-view">
                  <div className="control-group">
                    <label>LOAD INTENSITY: {sliderValue}%</label>
                    <input
                      type="range" min="1" max="100"
                      value={sliderValue}
                      onChange={(e) => setSliderValue(e.target.value)}
                    />
                  </div>
                  <div className="control-actions">
                    <button className="action-btn">REBOOT UNIT</button>
                    <button className="action-btn danger">FLUSH CACHE</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="screen-footer">
            <span className="status-indicator online">ONLINE</span>
            <span className="system-time">{new Date().toLocaleTimeString()}</span>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default RackUnitDetail;
