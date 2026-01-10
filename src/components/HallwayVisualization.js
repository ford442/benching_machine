import React, { useEffect, useRef, useState } from 'react';
import './HallwayVisualization.css';

function HallwayVisualization({ benchmarkData, isRunning }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  const [viewMode, setViewMode] = useState('2d'); // '2d' is now Grid View
  const [useLogScale, setUseLogScale] = useState(false); // Toggle for Level Comparison

  // --- Configuration ---
  const RACK_WIDTH = 220;
  const RACK_HEIGHT = 400; // Fixed height for grid calculation
  const GAP = 30;
  const START_PADDING = 40;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let animationFrame = 0;

    const dataToRender = benchmarkData || { configurations: [] };
    const configs = dataToRender.configurations.length > 0
      ? dataToRender.configurations
      : [{ name: 'Waiting...', tests: [] }];

    const resizeCanvas = () => {
      const containerW = container.clientWidth;

      if (viewMode === '2d') {
        // GRID MODE: Calculate rows needed
        // Available width for columns
        const availableW = containerW - (START_PADDING * 2);
        const colCount = Math.max(1, Math.floor(availableW / (RACK_WIDTH + GAP)));
        const rowCount = Math.ceil(configs.length / colCount);

        const requiredHeight = START_PADDING + (rowCount * (RACK_HEIGHT + GAP)) + START_PADDING;

        canvas.width = containerW; // Fill width
        canvas.height = Math.max(container.clientHeight, requiredHeight); // Scrollable height
      } else {
        // PERSPECTIVE: Fixed to viewport
        canvas.width = containerW;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      animationFrame++;
      // Determine max score for scaling
      let maxScore = 0;
      configs.forEach(c => c.tests.forEach(t => {
        if (t.opsPerSec > maxScore) maxScore = t.opsPerSec;
      }));
      if (maxScore === 0) maxScore = 100000;

      drawHallway(ctx, canvas.width, canvas.height, animationFrame, configs, isRunning, viewMode, useLogScale, maxScore, RACK_WIDTH, GAP, START_PADDING);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [benchmarkData, isRunning, viewMode, useLogScale]);

  return (
    <div className="hallway-visualization">
      <div className="view-controls">
        <button 
          className={`view-button ${viewMode === '2d' ? 'active' : ''}`}
          onClick={() => setViewMode('2d')}
        >
          Grid View
        </button>
        <button 
          className={`view-button ${viewMode === 'perspective' ? 'active' : ''}`}
          onClick={() => setViewMode('perspective')}
        >
          Perspective
        </button>
        <div style={{width: '20px'}}></div>
        <button
          className={`view-button ${useLogScale ? 'active' : ''}`}
          onClick={() => setUseLogScale(!useLogScale)}
          title="Use Logarithmic Scale for CPU vs GPU comparison"
        >
          {useLogScale ? '📊 Log Scale (On)' : '📊 Linear Scale'}
        </button>
      </div>

      <div className="canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} className="hallway-canvas" />
      </div>
    </div>
  );
}

function drawHallway(ctx, w, h, frame, configs, isRunning, viewMode, logScale, maxScore, rackW, gap, padding) {
  // Clear
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);

  if (viewMode === 'perspective') {
    drawPerspective(ctx, w, h, frame, configs, isRunning, logScale, maxScore);
  } else {
    drawGrid(ctx, w, h, frame, configs, isRunning, logScale, maxScore, rackW, gap, padding);
  }
}

function drawGrid(ctx, w, h, frame, configs, isRunning, logScale, maxScore, rackW, gap, padding) {
  // Grid Logic
  const availableW = w - (padding * 2);
  const colCount = Math.max(1, Math.floor(availableW / (rackW + gap)));

  // Center the grid if it's smaller than width
  const gridW = colCount * (rackW + gap) - gap;
  const startX = padding + (availableW - gridW) / 2;

  configs.forEach((config, i) => {
    const col = i % colCount;
    const row = Math.floor(i / colCount);

    const x = startX + col * (rackW + gap);
    const y = padding + row * (400 + gap); // 400 is approx rack height

    drawRack(ctx, x, y, rackW, 380, config, frame, 1.0, logScale, maxScore);
  });
}

function drawPerspective(ctx, width, height, frame, configs, isRunning, logScale, maxScore) {
  const cx = width / 2;
  const cy = height / 3;

  // Simple floor grid
  ctx.strokeStyle = 'rgba(102, 126, 234, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const y = height / 2 + i * 30;
    if (y > height) break;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cx, cy);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw racks in a single shrinking row (Classic Hallway)
  const rackCount = configs.length;
  configs.forEach((config, i) => {
    const offsetFromCenter = i - (rackCount - 1) / 2;
    const depth = 1 - (Math.abs(offsetFromCenter) * (0.8 / Math.max(5, rackCount)));
    const scale = Math.max(0.1, depth);
    
    const rackW = 220 * scale;
    const rackH = (height - 200) * scale;
    const x = cx + (offsetFromCenter * (240 * (15/rackCount))) - (rackW/2);
    const y = cy + 100 * scale;

    drawRack(ctx, x, y, rackW, rackH, config, frame, scale, logScale, maxScore);
  });
}

function drawRack(ctx, x, y, width, height, config, frame, scale, logScale, maxScore) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + 10 * scale, y + 10 * scale, width, height);

  // Body
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = config.color || '#4a5568';
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(x, y, width, height);

  // Header
  ctx.fillStyle = config.color || '#fff';
  ctx.font = `bold ${14 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(config.name, x + width / 2, y + 30 * scale);

  // Desc
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `${10 * scale}px sans-serif`;
  ctx.fillText(config.desc || '', x + width / 2, y + 45 * scale);

  // Bars
  if (config.tests && config.tests.length > 0) {
    const barHeight = 35 * scale;
    const gap = 12 * scale;
    const startY = y + 60 * scale;

    config.tests.forEach((test, i) => {
      const by = startY + i * (barHeight + gap);
      
      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = `${10 * scale}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(test.name.split(' ')[0], x + 10 * scale, by - 4 * scale);

      // Bar Calculation
      let pct = 0;
      if (logScale) {
        // Log Scale: Log(Val) / Log(Max)
        // Add 1 to avoid log(0)
        const valLog = Math.log10(test.opsPerSec + 1);
        const maxLog = Math.log10(maxScore + 1);
        pct = Math.max(0, valLog / maxLog);
      } else {
        // Linear Scale
        pct = Math.min(test.opsPerSec / maxScore, 1);
      }

      const barW = (width - 20 * scale) * pct;

      // Bar BG
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x + 10 * scale, by, width - 20 * scale, barHeight);

      // Animated Gradient
      const grad = ctx.createLinearGradient(x, 0, x + width, 0);
      const hue = (frame * 2 + i * 30) % 360;
      grad.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.9)`);
      grad.addColorStop(1, `hsla(${hue + 40}, 70%, 60%, 0.9)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(x + 10 * scale, by, barW, barHeight);

      // Score Text
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.font = `bold ${11 * scale}px monospace`;

      let scoreText = Math.round(test.opsPerSec).toLocaleString();
      if (test.opsPerSec > 1000000) {
        scoreText = (test.opsPerSec / 1000000).toFixed(1) + 'M';
      }

      ctx.fillText(scoreText, x + width - 15 * scale, by + barHeight - 8 * scale);
    });
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = `${12 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText("Initializing...", x + width/2, y + height/2);
  }
}

export default HallwayVisualization;
