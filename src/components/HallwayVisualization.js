import React, { useEffect, useRef, useState } from 'react';
import './HallwayVisualization.css';

function HallwayVisualization({ benchmarkData, isRunning }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [viewMode, setViewMode] = useState('perspective'); // Default to perspective for the "Hallway" feel

  // Animation constants
  const ANIMATION_SPEED = 50;
  const WAVE_AMPLITUDE = 15;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrame = 0;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      animationFrame++;
      // If no data yet, provide default empty configs to draw empty racks
      const dataToRender = benchmarkData || { 
        configurations: [
          { name: 'JavaScript', tests: [] },
          { name: 'Rust + WASM', tests: [] },
          { name: 'WASM Threads', tests: [] },
          { name: 'WASM64', tests: [] }
        ] 
      };
      
      drawHallway(ctx, canvas.width, canvas.height, animationFrame, dataToRender, isRunning, viewMode, ANIMATION_SPEED, WAVE_AMPLITUDE);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [benchmarkData, isRunning, viewMode]);

  return (
    <div className="hallway-visualization">
      <div className="view-controls">
        <button 
          className={`view-button ${viewMode === '2d' ? 'active' : ''}`}
          onClick={() => setViewMode('2d')}
        >
          2D Overview
        </button>
        <button 
          className={`view-button ${viewMode === 'perspective' ? 'active' : ''}`}
          onClick={() => setViewMode('perspective')}
        >
          Perspective Hallway
        </button>
      </div>
      <canvas ref={canvasRef} className="hallway-canvas" />
    </div>
  );
}

function drawHallway(ctx, width, height, frame, data, isRunning, viewMode, speed, waveAmp) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  const configs = data.configurations;

  if (viewMode === 'perspective') {
    drawPerspective(ctx, width, height, frame, configs, isRunning, speed, waveAmp);
  } else {
    draw2D(ctx, width, height, frame, configs, isRunning);
  }
}

function draw2D(ctx, width, height, frame, configs, isRunning) {
  const rackCount = configs.length;
  const rackWidth = Math.min(220, width / rackCount - 30);
  const rackHeight = height - 120;
  const totalWidth = (rackWidth * rackCount) + (20 * (rackCount - 1));
  const startX = (width - totalWidth) / 2;

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Runtime Environment Comparison', width / 2, 40);

  configs.forEach((config, i) => {
    const x = startX + i * (rackWidth + 20);
    const y = 80;

    drawRack(ctx, x, y, rackWidth, rackHeight, config, frame, 1.0);
  });
}

function drawPerspective(ctx, width, height, frame, configs, isRunning, speed, waveAmp) {
  const cx = width / 2;
  const cy = height / 3; // Vanishing point

  // Floor lines
  ctx.strokeStyle = 'rgba(102, 126, 234, 0.2)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const y = height / 2 + i * 60;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cx, cy);
    ctx.moveTo(width, y);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  }

  const rackCount = configs.length;
  const spacing = 180; 
  
  configs.forEach((config, i) => {
    const offsetFromCenter = i - (rackCount - 1) / 2;
    const depth = 1 - (Math.abs(offsetFromCenter) * 0.1); 
    const scale = depth;
    
    const rackWidth = 220 * scale;
    const rackHeight = (height - 200) * scale;
    
    const x = cx + (offsetFromCenter * 240 * scale) - (rackWidth / 2);
    const y = cy + 100 * scale;

    drawRack(ctx, x, y, rackWidth, rackHeight, config, frame, scale);
  });
}

function drawRack(ctx, x, y, width, height, config, frame, scale) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + 10 * scale, y + 10 * scale, width, height);

  // Rack Body
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(x, y, width, height);
  
  // Bezel / Frame
  ctx.strokeStyle = config.color || '#4a5568';
  ctx.lineWidth = 4 * scale;
  ctx.strokeRect(x, y, width, height);

  // Header
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(x, y, width, 50 * scale);
  
  ctx.fillStyle = config.color || '#fff';
  ctx.font = `bold ${14 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(config.name, x + width / 2, y + 30 * scale);

  // Benchmarks Bars
  if (config.tests && config.tests.length > 0) {
    const barHeight = 40 * scale;
    const gap = 15 * scale;
    const startY = y + 60 * scale;

    config.tests.forEach((test, i) => {
      const by = startY + i * (barHeight + gap);
      
      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = `${10 * scale}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(test.name, x + 10 * scale, by - 5 * scale);

      // Bar Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x + 10 * scale, by, width - 20 * scale, barHeight);

      // Value Bar
      const pct = Math.min(test.opsPerSec / 300000, 1);
      const barW = (width - 20 * scale) * pct;

      // Animated Gradient
      const grad = ctx.createLinearGradient(x, 0, x + width, 0);
      const hue = (frame * 2 + i * 30) % 360;
      grad.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.8)`);
      grad.addColorStop(1, `hsla(${hue + 40}, 70%, 60%, 0.8)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(x + 10 * scale, by, barW, barHeight);

      // Score Text
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.font = `bold ${10 * scale}px monospace`;
      ctx.fillText(Math.round(test.opsPerSec).toLocaleString(), x + width - 15 * scale, by + barHeight - 10 * scale);
    });
  } else {
    // Empty state / Loading
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.font = `${12 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText("Waiting for data...", x + width/2, y + height/2);
  }
}

export default HallwayVisualization;
