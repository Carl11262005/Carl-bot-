import { useEffect, useRef } from 'react';

export default function StockChart({ points, range }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points || points.length < 2) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 10, right: 10, bottom: 30, left: 55 };

    const closes = points.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range_val = max - min || 1;

    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    function xPos(i) {
      return padding.left + (i / (points.length - 1)) * chartW;
    }
    function yPos(val) {
      return padding.top + chartH - ((val - min) / range_val) * chartH;
    }

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Determine color based on first vs last price
    const isPositive = closes[closes.length - 1] >= closes[0];
    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const fillColor = isPositive
      ? 'rgba(34, 197, 94, 0.08)'
      : 'rgba(239, 68, 68, 0.08)';

    // Grid lines
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 0.5;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (i / gridLines) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = max - (i / gridLines) * range_val;
      ctx.fillStyle = '#666666';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`$${price.toFixed(2)}`, padding.left - 8, y + 4);
    }

    // Date labels
    ctx.fillStyle = '#666666';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(5, points.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (points.length - 1));
      const date = new Date(points[idx].date);
      let label;
      if (range === '1d') {
        label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (range === '1w') {
        label = date.toLocaleDateString([], { weekday: 'short' });
      } else if (range === 'max' || range === '1y') {
        label = date.toLocaleDateString([], { month: 'short', year: '2-digit' });
      } else {
        label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
      ctx.fillText(label, xPos(idx), h - 8);
    }

    // Fill area under line
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(closes[0]));
    for (let i = 1; i < closes.length; i++) {
      ctx.lineTo(xPos(i), yPos(closes[i]));
    }
    ctx.lineTo(xPos(closes.length - 1), padding.top + chartH);
    ctx.lineTo(xPos(0), padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(closes[0]));
    for (let i = 1; i < closes.length; i++) {
      ctx.lineTo(xPos(i), yPos(closes[i]));
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Current price dot
    const lastX = xPos(closes.length - 1);
    const lastY = yPos(closes[closes.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  }, [points, range]);

  if (!points || points.length < 2) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No chart data available
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 220, display: 'block' }}
    />
  );
}
