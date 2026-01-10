import React, { useEffect, useRef, useState, useCallback } from 'react';
import './HallwayVisualization.css';

function HallwayVisualization({ benchmarkData, isRunning }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  // View States
  // zoomMode: 'grid' (Distant), 'row' (Standard), 'single' (Focused)
  const [zoomMode, setZoomMode] = useState('grid');
  const [focusedTest, setFocusedTest] = useState(null); // Filter by specific test
  const [useLogScale, setUseLogScale] = useState(false);

  // --- Constants ---
  const RACK_WIDTH_STD = 220;
  const RACK_WIDTH_GRID = 60; // Tiny rack for distant view
  const GAP_STD = 30;
  const GAP_GRID = 10;

  // Interaction Handler
  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const data = benchmarkData || { configurations: [] };
    const configs = data.configurations;

    // Logic depends on current View Mode
    if (zoomMode === 'grid') {
      // Hit test for Grid Items
      const availableW = canvas.width - 40;
      const colCount = Math.max(1, Math.floor(availableW / (RACK_WIDTH_GRID + GAP_GRID)));

      const col = Math.floor((x - 20) / (RACK_WIDTH_GRID + GAP_GRID));
      const row = Math.floor((y - 20) / (100 + GAP_GRID)); // 100 is approx grid rack height
      const index = row * colCount + col;

      if (index >= 0 && index < configs.length) {
        // Clicked a rack -> Zoom in
        setZoomMode('row');
        // Optional: We could scroll to this rack, but standard 'row' view is fine for now
      }
    } else if (zoomMode === 'row') {
      // Hit test for Test Bars
      const rackW = 220;
      const gap = 30;
      const startX = 40;
      const startY = 120; // y(60) + header(60)
      const barH = 30;
      const barStep = 40; // 30 + 10 gap

      // 1. Determine which Rack (Column)
      // x = startX + i * (rackW + gap)
      // i = (x - startX) / (rackW + gap)
      if (x < startX) return;
      const colIndex = Math.floor((x - startX) / (rackW + gap));
      const xInRack = (x - startX) % (rackW + gap);

      // Check if we clicked on a rack (not the gap) and valid index
      if (xInRack <= rackW && colIndex >= 0 && colIndex < configs.length) {
        // 2. Determine which Bar (Row)
        if (y < startY) return; // Header click? (Ignore for now)

        const barIndex = Math.floor((y - startY) / barStep);
        const yInBar = (y - startY) % barStep;

        // Check if we clicked a bar (not the gap)
        const tests = configs[colIndex].tests;
        if (yInBar <= barH && barIndex >= 0 && barIndex < tests.length) {
          const clickedTest = tests[barIndex];
          // Toggle filter
          if (focusedTest === clickedTest.name) {
            setFocusedTest(null); // Un-zoom if already selected
          } else {
            setFocusedTest(clickedTest.name);
          }
        }
      }
    }
  }, [benchmarkData, zoomMode, focusedTest]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let animationFrame = 0;

    const dataToRender = benchmarkData || { configurations: [] };
    const configs = dataToRender.configurations;

    const resizeCanvas = () => {
      const containerW = container.clientWidth;
      const containerH = container.clientHeight;

      let reqW = containerW;
      let reqH = containerH;

      if (zoomMode === 'grid') {
        // Distant Grid Calculation
        const colCount = Math.max(1, Math.floor((containerW - 40) / (RACK_WIDTH_GRID + GAP_GRID)));
        const rowCount = Math.ceil(configs.length / colCount);
        reqH = Math.max(containerH, 40 + (rowCount * (100 + GAP_GRID)) + 40);
        reqW = containerW; // Grid fits width
      } else {
        // Row View (Standard) - Horizontal Scroll
        const totalW = 40 + (configs.length * (RACK_WIDTH_STD + GAP_STD)) + 40;
        reqW = Math.max(containerW, totalW);
        reqH = Math.max(containerH, 600); // Minimum height for details
      }

      if (canvas.width !== reqW || canvas.height !== reqH) {
        canvas.width = reqW;
        canvas.height = reqH;
      }
    };

    // Initial resize
    resizeCanvas();
    // Add resize listener
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    const animate = () => {
      animationFrame++;

      // Calculate Max Score dynamically based on filters
      let maxScore = 0;
      configs.forEach(c => c.tests.forEach(t => {
        // If we are focused on a specific test, only count that test's score
        if (!focusedTest || t.name === focusedTest) {
          if (t.opsPerSec > maxScore) maxScore = t.opsPerSec;
        }
      }));
      if (maxScore === 0) maxScore = 1;

      // Draw
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (zoomMode === 'grid') {
        drawDistantGrid(ctx, canvas.width, canvas.height, frameToTime(animationFrame), configs, maxScore);
      } else {
        drawStandardRow(ctx, canvas.width, canvas.height, frameToTime(animationFrame), configs, maxScore, focusedTest, useLogScale);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [benchmarkData, isRunning, zoomMode, focusedTest, useLogScale]);

  // Helper: Reset Filters
  const resetView = () => {
    setZoomMode('grid');
    setFocusedTest(null);
  };

  return (
    <div className="hallway-visualization">
      <div className="view-controls">
        <button className={`view-button ${zoomMode === 'grid' ? 'active' : ''}`} onClick={() => setZoomMode('grid')}>
          🔍 Distant Grid
        </button>
        <button className={`view-button ${zoomMode === 'row' ? 'active' : ''}`} onClick={() => setZoomMode('row')}>
          📏 Detailed Row
        </button>

        <div style={{width:'1px', height:'20px', background:'rgba(255,255,255,0.2)', margin:'0 10px'}}></div>

        <button className={`view-button ${useLogScale ? 'active' : ''}`} onClick={() => setUseLogScale(!useLogScale)}>
          📊 Log Scale
        </button>

        {focusedTest && (
          <button className="view-button active" onClick={() => setFocusedTest(null)} style={{background:'#e74c3c', borderColor:'#c0392b'}}>
             ✕ Clear Filter: "{focusedTest.split(' ')[0]}"
          </button>
        )}
      </div>

      <div className="canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="hallway-canvas"
          onClick={handleCanvasClick}
          style={{cursor: zoomMode === 'grid' ? 'zoom-in' : 'default'}}
        />
      </div>

      <div className="future-note">
        {(benchmarkData && benchmarkData.configurations) ? benchmarkData.configurations.length : 0} Racks Online
      </div>
    </div>
  );
}

// --- Draw Functions ---

function frameToTime(f) { return f * 0.05; }

function drawDistantGrid(ctx, w, h, time, configs, globalMax) {
  const rackW = 60;
  const rackH = 100;
  const gap = 10;
  const padding = 20;

  const colCount = Math.max(1, Math.floor((w - padding*2) / (rackW + gap)));

  configs.forEach((config, i) => {
    const col = i % colCount;
    const row = Math.floor(i / colCount);

    const x = padding + col * (rackW + gap);
    const y = padding + row * (rackH + gap);

    // Calculate "Total Heat" of the rack for color
    const totalScore = config.tests.reduce((acc, t) => acc + t.opsPerSec, 0);
    const intensity = Math.min(1, totalScore / (globalMax * 2)); // rough normalize

    // Rack Box
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(x, y, rackW, rackH);

    // Status Light (Activity)
    const pulse = Math.sin(time + i) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(${config.color === '#ff0000' ? '255, 50, 50' : '100, 255, 100'}, ${0.3 + pulse * 0.5})`;
    ctx.fillRect(x + 5, y + 5, rackW - 10, 5);

    // Mini Bars (Abstract representation)
    const barW = rackW - 10;
    const barH = (rackH - 20) / Math.max(1, config.tests.length);
    
    config.tests.forEach((t, ti) => {
      const by = y + 20 + ti * barH;
      const bw = barW * Math.min(1, t.opsPerSec / globalMax);
      ctx.fillStyle = config.color || '#aaa';
      ctx.fillRect(x + 5, by, bw, barH - 2);
    });

    // Label (Tiny)
    ctx.fillStyle = '#fff';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.name.substring(0, 8), x + rackW/2, y + rackH + 8);
  });
}

function drawStandardRow(ctx, w, h, time, configs, maxScore, focusedTest, logScale) {
  const rackW = 220;
  const rackH = h - 80;
  const gap = 30;
  const startX = 40;

  // Floor
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.moveTo(0, h-20); ctx.lineTo(w, h-20); ctx.stroke();

  configs.forEach((config, i) => {
    const x = startX + i * (rackW + gap);
    const y = 60;

    // Rack Body
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(x, y, rackW, rackH);
    ctx.strokeStyle = config.color || '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, rackW, rackH);

    // Header
    ctx.fillStyle = config.color || '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.name, x + rackW/2, y + 30);

    // Bars
    let currentY = y + 60;
    const barH = 30;

    config.tests.forEach((t, ti) => {
      // Filter Logic
      if (focusedTest && t.name !== focusedTest) return; // Skip if filtered

      // Calculation
      let pct = 0;
      if (logScale) {
        const valLog = Math.log10(t.opsPerSec + 1);
        const maxLog = Math.log10(maxScore + 1);
        pct = Math.max(0, valLog / maxLog);
      } else {
        pct = Math.min(1, t.opsPerSec / maxScore);
      }

      // Bar BG
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 10, currentY, rackW - 20, barH);

      // Value Bar
      const grad = ctx.createLinearGradient(x, 0, x + rackW, 0);
      const hue = (ti * 40) % 360;
      grad.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.8)`);
      grad.addColorStop(1, `hsla(${hue}, 70%, 65%, 0.8)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x + 10, currentY, (rackW - 20) * pct, barH);

      // Text
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.font = '10px monospace';
      ctx.fillText(t.name, x + 12, currentY + 12);

      ctx.textAlign = 'right';
      let scoreStr = Math.round(t.opsPerSec).toLocaleString();
      if (t.opsPerSec > 1000000) scoreStr = (t.opsPerSec/1000000).toFixed(1) + "M";
      ctx.fillText(scoreStr, x + rackW - 12, currentY + 24);

      currentY += barH + 10;
    });

    if (focusedTest && currentY === y + 60) {
      // Test not found in this rack
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.textAlign = 'center';
      ctx.fillText("N/A", x + rackW/2, y + 100);
    }
  });
}

export default HallwayVisualization;
