import React, { useEffect, useRef, useState } from 'react';
import './HallwayVisualization.css';

function HallwayVisualization({ benchmarkData, isRunning }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const [viewMode, setViewMode] = useState('2d');

  // --- Configuration ---
  const ANIMATION_SPEED = 50;
  const RACK_WIDTH = 220;  // Fixed width per rack
  const RACK_SPACING = 30; // Gap between racks
  const START_PADDING = 40;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let animationFrame = 0;

    // Safety check for data
    const dataToRender = benchmarkData || { configurations: [] };
    const configs = dataToRender.configurations.length > 0
      ? dataToRender.configurations
      : [{ name: 'Waiting for data...', tests: [] }];

    const resizeCanvas = () => {
      const containerH = container.clientHeight;
      const containerW = container.clientWidth;

      if (viewMode === '2d') {
        // SCROLL MODE: Width grows with data
        const requiredWidth = START_PADDING + (configs.length * (RACK_WIDTH + RACK_SPACING)) + START_PADDING;
        // Ensure canvas is at least as wide as the screen, but can grow larger
        canvas.width = Math.max(containerW, requiredWidth);
      } else {
        // PERSPECTIVE MODE: Fixed to viewport (looks down the hall)
        canvas.width = containerW;
      }
      canvas.height = containerH;
    };

    // Initial resize + Listen for window changes
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      animationFrame++;
      drawHallway(ctx, canvas.width, canvas.height, animationFrame, configs, isRunning, viewMode, RACK_WIDTH, RACK_SPACING, START_PADDING);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [benchmarkData, isRunning, viewMode]); // Re-run when data changes (e.g. race happens)

  return (
    <div className="hallway-visualization">
      <div className="view-controls">
        <button 
          className={`view-button ${viewMode === '2d' ? 'active' : ''}`}
          onClick={() => setViewMode('2d')}
        >
          2D Overview (Scrollable)
        </button>
        <button 
          className={`view-button ${viewMode === 'perspective' ? 'active' : ''}`}
          onClick={() => setViewMode('perspective')}
        >
          Perspective Hallway
        </button>
      </div>

      {/* The Scrollable Window */}
      <div className="canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} className="hallway-canvas" />
      </div>
    </div>
  );
}

function drawHallway(ctx, width, height, frame, configs, isRunning, viewMode, rackW, spacing, startX) {
  // Clear Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  if (viewMode === 'perspective') {
    drawPerspective(ctx, width, height, frame, configs, isRunning);
  } else {
    draw2D(ctx, width, height, frame, configs, isRunning, rackW, spacing, startX);
  }
}

function draw2D(ctx, width, height, frame, configs, isRunning, rackW, spacing, startX) {
  const rackHeight = height - 100;

  // Draw Floor Line
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.moveTo(0, height - 20);
  ctx.lineTo(width, height - 20);
  ctx.stroke();

  // Draw Racks
  configs.forEach((config, i) => {
    const x = startX + i * (rackW + spacing);
    const y = 60; // Top margin

    drawRack(ctx, x, y, rackW, rackHeight, config, frame, 1.0);
  });
}

function drawPerspective(ctx, width, height, frame, configs, isRunning) {
  const cx = width / 2;
  const cy = height / 3;

  // Grid Lines (Floor)
  ctx.strokeStyle = 'rgba(102, 126, 234, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const y = height / 2 + i * 40;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cx, cy);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw racks back-to-front
  const rackCount = configs.length;
  
  configs.forEach((config, i) => {
    const offsetFromCenter = i - (rackCount - 1) / 2;
    // Depth Calculation
    const depth = 1 - (Math.abs(offsetFromCenter) * (0.8 / Math.max(5, rackCount)));
    const scale = Math.max(0.1, depth);
    
    const rackW = 220 * scale;
    const rackH = (height - 200) * scale;
    
    // Position
    const x = cx + (offsetFromCenter * (240 * (15/rackCount))) - (rackW/2);
    const y = cy + 100 * scale;

    drawRack(ctx, x, y, rackW, rackH, config, frame, scale);
  });
}

function drawRack(ctx, x, y, width, height, config, frame, scale) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + 10 * scale, y + 10 * scale, width, height);

  // Body
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(x, y, width, height);
  
  // Border (Neon Glow)
  ctx.strokeStyle = config.color || '#4a5568';
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(x, y, width, height);

  // Header
  ctx.fillStyle = config.color || '#fff';
  ctx.font = `bold ${14 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(config.name, x + width / 2, y + 30 * scale);

  // Config Desc (Tiny)
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

      // Bar BG
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x + 10 * scale, by, width - 20 * scale, barHeight);

      // WebGPU Handling: Scale down visual for massive scores
      const MAX_VISUAL_SCORE = 500000;
      const pct = Math.min(test.opsPerSec / MAX_VISUAL_SCORE, 1);
      const barW = (width - 20 * scale) * pct;

      // Animated Gradient
      const grad = ctx.createLinearGradient(x, 0, x + width, 0);
      const hue = (frame * 2 + i * 30) % 360;
      grad.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.9)`);
      grad.addColorStop(1, `hsla(${hue + 40}, 70%, 60%, 0.9)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(x + 10 * scale, by, barW, barHeight);

      // Score
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.font = `bold ${11 * scale}px monospace`;
      // Use "M" for millions if score is huge
      const scoreText = test.opsPerSec > 1000000
        ? (test.opsPerSec / 1000000).toFixed(1) + 'M'
        : Math.round(test.opsPerSec).toLocaleString();

      ctx.fillText(scoreText, x + width - 15 * scale, by + barHeight - 8 * scale);
    });
  } else {
    // Empty State
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = `${12 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText("Initializing...", x + width/2, y + height/2);
  }
}

export default HallwayVisualization;
