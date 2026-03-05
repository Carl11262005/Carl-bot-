import { useState, useEffect, useMemo } from 'react';
import { getQuote } from '../services/stockService.js';

/* ─── helpers ───────────────────────────────────────────────── */
function fmt(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtUSD(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  return '$' + fmt(n, decimals);
}

/* ─── sub-components ────────────────────────────────────────── */
function AllocBar({ label, pct, color }) {
  return (
    <div className="pi-alloc-row">
      <span className="pi-alloc-label">{label}</span>
      <div className="pi-alloc-track">
        <div
          className="pi-alloc-fill"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
      <span className="pi-alloc-pct">{Math.round(pct)}%</span>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────── */
export default function PortfolioInsights({ portfolio, cryptoHoldings, memeHoldings }) {
  const [stockPrices, setStockPrices] = useState({});
  const [expanded, setExpanded]       = useState(false);

  /* fetch live stock prices once (refresh every 60 s) */
  const symbolKey = portfolio.map((s) => s.symbol).join(',');
  useEffect(() => {
    if (!portfolio.length) return;
    let cancelled = false;

    async function fetchAll() {
      const pairs = await Promise.allSettled(
        portfolio.map((s) =>
          getQuote(s.symbol).then((q) => [s.symbol, q?.price ?? null])
        )
      );
      if (cancelled) return;
      const map = {};
      pairs.forEach((r) => {
        if (r.status === 'fulfilled' && r.value[1] !== null) map[r.value[0]] = r.value[1];
      });
      setStockPrices(map);
    }

    fetchAll();
    const id = setInterval(fetchAll, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [symbolKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* derive all numbers ─────────────────────────────────────── */
  const analysis = useMemo(() => {
    const hasPrices = Object.keys(stockPrices).length > 0;

    /* cost basis */
    const stockBasis  = portfolio.reduce((s, h) => s + (h.shares || 0) * (h.buyPrice || 0), 0);
    const cryptoBasis = cryptoHoldings.reduce((s, h) => s + (h.amount || 0) * (h.buyPrice || 0), 0);
    const memeBasis   = memeHoldings.reduce((s, h) => s + (h.amount || 0) * (h.buyPrice || 0), 0);

    /* live stock value */
    const stockLive = portfolio.reduce((s, h) => {
      const p = stockPrices[h.symbol] ?? h.buyPrice ?? 0;
      return s + (h.shares || 0) * p;
    }, 0);

    const stockPnL    = hasPrices ? stockLive - stockBasis : null;
    const stockPnLPct = stockBasis > 0 && hasPrices ? (stockPnL / stockBasis) * 100 : null;

    /* estimated total (live stocks + coins at buy price) */
    const totalEst    = (hasPrices ? stockLive : stockBasis) + cryptoBasis + memeBasis;

    /* allocations */
    const stockAlloc  = totalEst > 0 ? (hasPrices ? stockLive : stockBasis) / totalEst * 100 : 0;
    const cryptoAlloc = totalEst > 0 ? cryptoBasis / totalEst * 100 : 0;
    const memeAlloc   = totalEst > 0 ? memeBasis   / totalEst * 100 : 0;

    /* health score (0–100) */
    let score = 60;
    if (portfolio.length >= 5)  score += 10;
    else if (portfolio.length >= 2) score += 5;
    if (portfolio.length > 0 && cryptoHoldings.length > 0) score += 5;
    if (memeAlloc > 50) score -= 20;
    else if (memeAlloc > 25) score -= 10;
    else if (memeAlloc > 0 && memeAlloc <= 10) score += 2;
    if (cryptoAlloc + memeAlloc > 60) score -= 10;
    if (portfolio.length === 1) score -= 10;
    score = Math.max(0, Math.min(100, score));

    const healthLabel = score >= 75 ? 'Healthy' : score >= 50 ? 'Moderate' : 'High Risk';
    const healthColor = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

    /* risk observations */
    const risks      = [];
    const positives  = [];
    const suggestions = [];

    if (portfolio.length === 0) {
      risks.push('No stocks tracked — add some shares to enable P&L tracking.');
    } else if (portfolio.length < 3) {
      risks.push('Low stock diversification — you are exposed to single-company risk.');
    }

    if (memeAlloc > 30) {
      risks.push(`Meme coins are ${Math.round(memeAlloc)}% of your portfolio — highly speculative, can go to zero.`);
    }

    if (cryptoAlloc + memeAlloc > 60) {
      risks.push('Over 60% of your portfolio is in crypto/meme assets, which are extremely volatile.');
    }

    const bigStock = portfolio.find((h) => {
      const p   = stockPrices[h.symbol] ?? h.buyPrice ?? 0;
      const val = (h.shares || 0) * p;
      return totalEst > 0 && val / totalEst > 0.4;
    });
    if (bigStock) {
      risks.push(`${bigStock.symbol} is more than 40% of your total portfolio — concentrated position risk.`);
    }

    if (portfolio.length >= 5) {
      positives.push('Good stock diversification across multiple companies.');
    }
    if (cryptoHoldings.length > 0 && portfolio.length > 0) {
      positives.push('You hold both stocks and crypto — multi-asset approach.');
    }
    if (memeAlloc > 0 && memeAlloc <= 10) {
      positives.push('Meme coin exposure is small and well-contained.');
    }
    if (stockPnL !== null && stockPnL > 0) {
      positives.push(`Your stock holdings are currently up ${fmtUSD(stockPnL, 2)} (+${fmt(stockPnLPct, 1)}%).`);
    }

    /* long-term suggestions */
    suggestions.push('Dollar-cost average (DCA): invest a fixed amount every month to reduce timing risk.');
    if (portfolio.length < 5) {
      suggestions.push('Consider adding an S&P 500 index ETF (VOO, SPY, or QQQ) for instant broad diversification.');
    }
    if (memeAlloc > 15) {
      suggestions.push('Limit speculative (meme) assets to 5–10% of your total portfolio to protect your downside.');
    }
    if (cryptoHoldings.length > 0 || memeHoldings.length > 0) {
      suggestions.push('Track every crypto trade for taxes — in the US each trade is a taxable event.');
    }
    suggestions.push('Keep 3–6 months of living expenses in a high-yield savings account before investing more.');
    suggestions.push('Rebalance your portfolio every 3–6 months to stay on target with your allocation goals.');
    suggestions.push('Avoid checking prices daily — compounding rewards patience, not constant trading decisions.');

    return {
      stockBasis, cryptoBasis, memeBasis, stockLive, hasPrices,
      stockPnL, stockPnLPct, totalEst,
      stockAlloc, cryptoAlloc, memeAlloc,
      score, healthLabel, healthColor,
      risks, positives, suggestions,
    };
  }, [portfolio, cryptoHoldings, memeHoldings, stockPrices]);

  const hasAny = portfolio.length > 0 || cryptoHoldings.length > 0 || memeHoldings.length > 0;
  if (!hasAny) return null;

  const { totalEst, stockPnL, stockPnLPct, hasPrices, score, healthLabel, healthColor,
          stockAlloc, cryptoAlloc, memeAlloc, risks, positives, suggestions } = analysis;

  const pnlPositive = stockPnL !== null && stockPnL >= 0;

  return (
    <div className="pi-card">
      {/* ── Header ── */}
      <button className="pi-header" onClick={() => setExpanded((v) => !v)}>
        <div className="pi-title-group">
          <span className="pi-icon">📊</span>
          <span className="pi-title">Portfolio Overview</span>
        </div>
        <div className="pi-header-right">
          <span className="pi-health-badge" style={{ background: healthColor + '22', color: healthColor, borderColor: healthColor + '55' }}>
            {healthLabel}
          </span>
          <span className={`pi-chevron ${expanded ? 'open' : ''}`}>›</span>
        </div>
      </button>

      {/* ── Summary row (always visible) ── */}
      <div className="pi-summary-row">
        <div className="pi-metric">
          <span className="pi-metric-label">Est. Value</span>
          <span className="pi-metric-value">{fmtUSD(totalEst, 2)}</span>
        </div>

        <div className="pi-metric-divider" />

        <div className="pi-metric">
          <span className="pi-metric-label">Stock P&amp;L</span>
          <span className="pi-metric-value" style={{ color: hasPrices ? (pnlPositive ? '#22c55e' : '#ef4444') : 'var(--text-muted)' }}>
            {hasPrices
              ? `${pnlPositive ? '+' : ''}${fmtUSD(stockPnL, 2)} (${pnlPositive ? '+' : ''}${stockPnLPct != null ? fmt(stockPnLPct, 1) : '—'}%)`
              : 'Loading…'}
          </span>
        </div>

        <div className="pi-metric-divider" />

        <div className="pi-metric">
          <span className="pi-metric-label">Health</span>
          <div className="pi-score-row">
            <div className="pi-score-track">
              <div className="pi-score-fill" style={{ width: `${score}%`, background: healthColor }} />
            </div>
            <span className="pi-score-num" style={{ color: healthColor }}>{score}</span>
          </div>
        </div>
      </div>

      {/* ── Allocation bars (always visible) ── */}
      {(stockAlloc > 0 || cryptoAlloc > 0 || memeAlloc > 0) && (
        <div className="pi-alloc-section">
          {stockAlloc > 0  && <AllocBar label="Stocks" pct={stockAlloc}  color="#3b82f6" />}
          {cryptoAlloc > 0 && <AllocBar label="Crypto" pct={cryptoAlloc} color="#a855f7" />}
          {memeAlloc > 0   && <AllocBar label="Meme"   pct={memeAlloc}   color="#f59e0b" />}
        </div>
      )}

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="pi-expanded">
          {/* Observations */}
          {(risks.length > 0 || positives.length > 0) && (
            <div className="pi-section">
              <div className="pi-section-heading">Observations</div>
              {risks.map((r, i) => (
                <div key={`r${i}`} className="pi-insight risk">⚠ {r}</div>
              ))}
              {positives.map((p, i) => (
                <div key={`p${i}`} className="pi-insight positive">✓ {p}</div>
              ))}
            </div>
          )}

          {/* Long-term suggestions */}
          <div className="pi-section">
            <div className="pi-section-heading">Long-term Suggestions</div>
            {suggestions.map((s, i) => (
              <div key={i} className="pi-suggestion">💡 {s}</div>
            ))}
          </div>

          <div className="pi-disclaimer">
            Not financial advice. Always do your own research before investing.
          </div>
        </div>
      )}
    </div>
  );
}
