import { useEffect, useRef } from 'react';

export default function Sparkline({ points, width = 80, height = 32 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points || points.length < 2) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const closes = points.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;

    const pad = 2;
    const chartW = width - pad * 2;
    const chartH = height - pad * 2;

    const isPositive = closes[closes.length - 1] >= closes[0];
    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const fillTop = isPositive
      ? 'rgba(34, 197, 94, 0.25)'
      : 'rgba(239, 68, 68, 0.25)';
    const fillBottom = 'rgba(0, 0, 0, 0)';

    function x(i) {
      return pad + (i / (closes.length - 1)) * chartW;
    }
    function y(val) {
      return pad + chartH - ((val - min) / range) * chartH;
    }

    // Gradient fill under line
    const grad = ctx.createLinearGradient(0, pad, 0, height - pad);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBottom);

    ctx.beginPath();
    ctx.moveTo(x(0), y(closes[0]));
    for (let i = 1; i < closes.length; i++) {
      ctx.lineTo(x(i), y(closes[i]));
    }
    ctx.lineTo(x(closes.length - 1), height - pad);
    ctx.lineTo(x(0), height - pad);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(x(0), y(closes[0]));
    for (let i = 1; i < closes.length; i++) {
      ctx.lineTo(x(i), y(closes[i]));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [points, width, height]);

  if (!points || points.length < 2) {
    return <div style={{ width, height }} />;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
    />
  );
}
