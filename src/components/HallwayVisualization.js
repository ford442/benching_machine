import React, { useEffect, useRef, useState } from 'react';
import './HallwayVisualization.css';

function HallwayVisualization({ benchmarkData, isRunning }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [viewMode, setViewMode] = useState('2d'); // '2d' or 'perspective'

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrame = 0;

    // Resize canvas to fill container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      animationFrame++;
      drawHallway(ctx, canvas.width, canvas.height, animationFrame, benchmarkData, isRunning, viewMode);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [benchmarkData, isRunning, viewMode]);

  return (
    <div className="hallway-visualization">
      <div className="view-controls">
        <button 
          className={`view-button ${viewMode === '2d' ? 'active' : ''}`}
          onClick={() => setViewMode('2d')}
        >
          2D View
        </button>
        <button 
          className={`view-button ${viewMode === 'perspective' ? 'active' : ''}`}
          onClick={() => setViewMode('perspective')}
        >
          Perspective View
        </button>
        <div className="future-note">
          💡 3D view coming soon!
        </div>
      </div>
      <canvas ref={canvasRef} className="hallway-canvas" />
    </div>
  );
}

// Drawing function for the hallway visualization
function drawHallway(ctx, width, height, frame, benchmarkData, isRunning, viewMode) {
  // Clear canvas
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  if (viewMode === 'perspective') {
    drawPerspectiveHallway(ctx, width, height, frame, benchmarkData, isRunning);
  } else {
    draw2DHallway(ctx, width, height, frame, benchmarkData, isRunning);
  }
}

function draw2DHallway(ctx, width, height, frame, benchmarkData, isRunning) {
  const rackCount = 3; // CPU, Memory, Compilation
  const rackWidth = Math.min(250, width / rackCount - 40);
  const rackHeight = height - 150;
  const spacing = (width - rackWidth * rackCount) / (rackCount + 1);

  // Draw title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Server Rack Hallway - Benchmark Results', width / 2, 40);

  const categories = ['cpu', 'memory', 'compilation'];
  const categoryNames = ['CPU Benchmarks', 'Memory Benchmarks', 'Compilation Benchmarks'];
  const categoryIcons = ['⚙️', '💾', '⏱️'];

  categories.forEach((category, rackIndex) => {
    const x = spacing + rackIndex * (rackWidth + spacing);
    const y = 80;

    // Draw rack frame (server cabinet)
    drawRackFrame(ctx, x, y, rackWidth, rackHeight);

    // Draw rack header
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(x + 10, y + 10, rackWidth - 20, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(categoryIcons[rackIndex] + ' ' + categoryNames[rackIndex], x + rackWidth / 2, y + 40);

    // Draw benchmark bars if data available
    if (benchmarkData && benchmarkData.benchmarks[category]) {
      const benchmarks = benchmarkData.benchmarks[category];
      const barHeight = (rackHeight - 100) / benchmarks.length - 20;

      benchmarks.forEach((benchmark, index) => {
        const barY = y + 80 + index * (barHeight + 20);
        drawBenchmarkBar(ctx, x + 20, barY, rackWidth - 40, barHeight, benchmark, frame);
      });
    } else if (isRunning) {
      // Show loading animation
      drawLoadingAnimation(ctx, x + rackWidth / 2, y + rackHeight / 2, frame);
    } else {
      // Show placeholder
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data - Run benchmarks', x + rackWidth / 2, y + rackHeight / 2);
    }

    // Add blinking LEDs
    drawLEDs(ctx, x + rackWidth - 30, y + 15, frame, isRunning);
  });
}

function drawPerspectiveHallway(ctx, width, height, frame, benchmarkData, isRunning) {
  // Draw perspective lines for depth
  const vanishingPointX = width / 2;
  const vanishingPointY = height / 3;

  // Draw floor perspective lines
  ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = height / 2 + i * 50;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(vanishingPointX, vanishingPointY);
    ctx.moveTo(width, y);
    ctx.lineTo(vanishingPointX, vanishingPointY);
    ctx.stroke();
  }

  // Draw racks in perspective
  const rackCount = 3;
  const baseRackWidth = 200;
  const depthFactor = 0.6;

  for (let i = 0; i < rackCount; i++) {
    const depth = 1 - (i * 0.25);
    const rackWidth = baseRackWidth * depth;
    const rackHeight = 300 * depth;
    const x = vanishingPointX - rackWidth / 2 + (Math.sin(frame / 50) * 20 * (i - 1));
    const y = vanishingPointY + i * 100;

    // Draw rack with depth
    drawRackFrame(ctx, x, y, rackWidth, rackHeight);

    const categories = ['cpu', 'memory', 'compilation'];
    const category = categories[i];
    
    if (benchmarkData && benchmarkData.benchmarks[category]) {
      const benchmarks = benchmarkData.benchmarks[category];
      const barCount = Math.min(3, benchmarks.length);
      
      for (let j = 0; j < barCount; j++) {
        const barY = y + 40 + j * 40 * depth;
        const barWidth = rackWidth - 20;
        const barHeight = 25 * depth;
        drawBenchmarkBar(ctx, x + 10, barY, barWidth, barHeight, benchmarks[j], frame, depth);
      }
    }
  }

  // Add perspective text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('3D Hallway View (Preview)', width / 2, 30);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('Future: Full 3D navigation with Three.js/WebGL', width / 2, 55);
}

function drawRackFrame(ctx, x, y, width, height) {
  // Main rack body
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(x, y, width, height);

  // Rack border
  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  // Ventilation slots
  ctx.strokeStyle = '#1a202c';
  ctx.lineWidth = 1;
  for (let i = 0; i < height; i += 10) {
    ctx.beginPath();
    ctx.moveTo(x + 5, y + i);
    ctx.lineTo(x + width - 5, y + i);
    ctx.stroke();
  }
}

function drawBenchmarkBar(ctx, x, y, width, height, benchmark, frame, opacity = 1) {
  // Background
  ctx.fillStyle = `rgba(74, 85, 104, ${opacity * 0.8})`;
  ctx.fillRect(x, y, width, height);

  // Label
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  const label = benchmark.name.length > 30 ? benchmark.name.substring(0, 27) + '...' : benchmark.name;
  ctx.fillText(label, x + 5, y + height / 2 - 8);

  // Calculate bar width based on ops/sec
  const maxOps = 200000; // Normalize to this value
  const normalizedValue = Math.min(benchmark.opsPerSec / maxOps, 1);
  const barWidth = (width - 10) * normalizedValue;

  // Animated gradient bar
  const gradient = ctx.createLinearGradient(x + 5, y, x + 5 + barWidth, y);
  const hue = (frame + benchmark.opsPerSec / 1000) % 360;
  gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${opacity})`);
  gradient.addColorStop(1, `hsla(${hue + 60}, 70%, 60%, ${opacity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(x + 5, y + height / 2 + 2, barWidth, height / 2 - 7);

  // Value text
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(benchmark.opsPerSec).toLocaleString()} ops/s`, x + width - 5, y + height - 5);
}

function drawLoadingAnimation(ctx, x, y, frame) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((frame * 0.05) * Math.PI / 180);

  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 1.5);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Loading...', x, y + 50);
}

function drawLEDs(ctx, x, y, frame, isActive) {
  const leds = [
    { color: isActive ? '#00ff00' : '#003300', blink: true },
    { color: '#0000ff', blink: false },
    { color: '#ff0000', blink: false }
  ];

  leds.forEach((led, index) => {
    const opacity = led.blink && Math.sin(frame / 10) > 0 ? 1 : 0.3;
    ctx.fillStyle = led.color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x, y + index * 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

export default HallwayVisualization;
