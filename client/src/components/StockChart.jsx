import { useEffect, useRef, useState, useCallback } from 'react';

const PAD = { top: 12, right: 12, bottom: 30, left: 60 };

function fmtVal(v) {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1000) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1)    return v.toFixed(2);
  return v.toPrecision(4);
}

function fmtVolume(v) {
  if (v == null) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
}

function formatDate(date, range) {
  const d = new Date(date);
  if (range === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (range === '1w') return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StockChart({ points, range }) {
  const baseRef    = useRef(null);
  const overlayRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // ── Base chart ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = baseRef.current;
    if (!canvas || !points || points.length < 2) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const w      = rect.width;
    const h      = rect.height;
    const closes = points.map((p) => p.close);
    const minV   = Math.min(...closes);
    const maxV   = Math.max(...closes);
    const rangeV = maxV - minV || 1;
    const chartW = w - PAD.left - PAD.right;
    const chartH = h - PAD.top  - PAD.bottom;

    const xPos = (i) => PAD.left + (i / (points.length - 1)) * chartW;
    const yPos = (v) => PAD.top  + chartH - ((v - minV) / rangeV) * chartH;

    ctx.clearRect(0, 0, w, h);

    const isPos     = closes[closes.length - 1] >= closes[0];
    const lineColor = isPos ? '#22c55e' : '#ef4444';
    const fillColor = isPos ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';

    // Grid lines + price labels
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = PAD.top + (i / gridCount) * chartH;
      ctx.strokeStyle = '#222';
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(w - PAD.right, y);
      ctx.stroke();

      const price = maxV - (i / gridCount) * rangeV;
      let pLabel;
      if (price >= 1000) pLabel = '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
      else if (price >= 1) pLabel = '$' + price.toFixed(2);
      else pLabel = '$' + price.toPrecision(3);

      ctx.fillStyle  = '#666';
      ctx.font       = '11px Inter, system-ui, sans-serif';
      ctx.textAlign  = 'right';
      ctx.fillText(pLabel, PAD.left - 6, y + 4);
    }

    // Date labels along X-axis
    ctx.fillStyle = '#666';
    ctx.font      = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(5, points.length);
    for (let i = 0; i < labelCount; i++) {
      const idx  = Math.floor((i / (labelCount - 1)) * (points.length - 1));
      const date = new Date(points[idx].date);
      let label;
      if      (range === '1d')              label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      else if (range === '1w')              label = date.toLocaleDateString([], { weekday: 'short' });
      else if (range === 'max' || range === '1y') label = date.toLocaleDateString([], { month: 'short', year: '2-digit' });
      else                                  label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      ctx.fillText(label, xPos(idx), h - 8);
    }

    // Fill area under line
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(closes[0]));
    for (let i = 1; i < closes.length; i++) ctx.lineTo(xPos(i), yPos(closes[i]));
    ctx.lineTo(xPos(closes.length - 1), PAD.top + chartH);
    ctx.lineTo(xPos(0), PAD.top + chartH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Price line
    ctx.beginPath();
    ctx.moveTo(xPos(0), yPos(closes[0]));
    for (let i = 1; i < closes.length; i++) ctx.lineTo(xPos(i), yPos(closes[i]));
    ctx.strokeStyle = lineColor;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.stroke();

    // End dot
    ctx.beginPath();
    ctx.arc(xPos(closes.length - 1), yPos(closes[closes.length - 1]), 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  }, [points, range]);

  // ── Crosshair overlay ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !points || points.length < 2) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    if (hoveredIdx == null) return;

    const w      = rect.width;
    const h      = rect.height;
    const closes = points.map((p) => p.close);
    const minV   = Math.min(...closes);
    const maxV   = Math.max(...closes);
    const rangeV = maxV - minV || 1;
    const chartW = w - PAD.left - PAD.right;
    const chartH = h - PAD.top  - PAD.bottom;

    const xPos = (i) => PAD.left + (i / (points.length - 1)) * chartW;
    const yPos = (v) => PAD.top  + chartH - ((v - minV) / rangeV) * chartH;

    const isPos     = closes[closes.length - 1] >= closes[0];
    const lineColor = isPos ? '#22c55e' : '#ef4444';

    const pt = points[hoveredIdx];
    const px = xPos(hoveredIdx);
    const py = yPos(pt.close);

    // Dashed crosshair
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(px, PAD.top);       ctx.lineTo(px, PAD.top + chartH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.left, py);       ctx.lineTo(w - PAD.right, py);   ctx.stroke();
    ctx.setLineDash([]);

    // Price pill on Y-axis
    const priceText = '$' + fmtVal(pt.close);
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    const pp     = 5;
    const pTW    = ctx.measureText(priceText).width;
    const pPillW = pTW + pp * 2;
    const pPillH = 18;
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.roundRect(2, py - pPillH / 2, pPillW, pPillH, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(priceText, 2 + pp, py - pPillH / 2 + 13);

    // Date pill on X-axis
    const dateText = formatDate(pt.date, range);
    const dTW      = ctx.measureText(dateText).width;
    const dPillW   = dTW + pp * 2;
    const dPillH   = 17;
    let dPillX = px - dPillW / 2;
    if (dPillX < PAD.left)             dPillX = PAD.left;
    if (dPillX + dPillW > w - PAD.right) dPillX = w - PAD.right - dPillW;
    ctx.fillStyle = 'rgba(30,30,30,0.9)';
    ctx.beginPath();
    ctx.roundRect(dPillX, h - PAD.bottom + 3, dPillW, dPillH, 3);
    ctx.fill();
    ctx.fillStyle = '#ccc';
    ctx.fillText(dateText, dPillX + pp, h - PAD.bottom + 3 + 12);

    // Hover dot
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle   = lineColor;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }, [hoveredIdx, points, range]);

  // ── Pointer event handler ────────────────────────────────────────────────────
  const handleMove = useCallback((clientX) => {
    if (!points || points.length < 2) return;
    const canvas = overlayRef.current;
    if (!canvas) return;
    const rect   = canvas.getBoundingClientRect();
    const chartW = rect.width - PAD.left - PAD.right;
    const ratio  = (clientX - rect.left - PAD.left) / chartW;
    const idx    = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
    setHoveredIdx(idx);
  }, [points]);

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!points || points.length < 2) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No chart data available
      </div>
    );
  }

  const displayPt = hoveredIdx != null ? points[hoveredIdx] : points[points.length - 1];

  return (
    <div className="chart-wrapper">
      {/* OHLCV tooltip bar */}
      <div className="chart-tooltip-bar">
        {displayPt.open   != null && <span className="ctb-item"><span className="ctb-label">O</span><span className="ctb-val">${fmtVal(displayPt.open)}</span></span>}
        {displayPt.high   != null && <span className="ctb-item"><span className="ctb-label">H</span><span className="ctb-val">${fmtVal(displayPt.high)}</span></span>}
        {displayPt.low    != null && <span className="ctb-item"><span className="ctb-label">L</span><span className="ctb-val">${fmtVal(displayPt.low)}</span></span>}
        {displayPt.close  != null && <span className="ctb-item"><span className="ctb-label">C</span><span className="ctb-val">${fmtVal(displayPt.close)}</span></span>}
        {displayPt.volume != null && <span className="ctb-item"><span className="ctb-label">V</span><span className="ctb-val">{fmtVolume(displayPt.volume)}</span></span>}
        {hoveredIdx != null && <span className="ctb-date">{formatDate(displayPt.date, range)}</span>}
      </div>

      {/* Canvas stack */}
      <div style={{ position: 'relative' }}>
        <canvas ref={baseRef} style={{ width: '100%', height: 220, display: 'block' }} />
        <canvas
          ref={overlayRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 220, cursor: 'crosshair' }}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseLeave={() => setHoveredIdx(null)}
          onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0].clientX); }}
          onTouchEnd={() => setHoveredIdx(null)}
        />
      </div>
    </div>
  );
}
