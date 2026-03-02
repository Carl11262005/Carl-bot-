import { useState, useEffect, useMemo } from 'react';
import StockChart from './StockChart.jsx';
import { getCryptoChart, getMemeChart } from '../services/cryptoService.js';
import '../styles/CryptoDetail.css';

const RANGES = [
  { label: '1D', days: '1' },
  { label: '7D', days: '7' },
  { label: '1M', days: '30' },
  { label: '3M', days: '90' },
  { label: '1Y', days: '365' },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtPrice(price) {
  if (price == null) return '—';
  if (price >= 10_000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1_000)  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)      return '$' + price.toFixed(2);
  if (price >= 0.01)   return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toPrecision(3);
}

function fmtLarge(v) {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e9)  return '$' + (v / 1e9).toFixed(2)  + 'B';
  if (v >= 1e6)  return '$' + (v / 1e6).toFixed(2)  + 'M';
  if (v >= 1e3)  return '$' + (v / 1e3).toFixed(1)  + 'K';
  return '$' + v.toLocaleString();
}

// ── Safety / timing analysis engine ──────────────────────────────────────────

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta; else losses -= delta;
  }
  if (losses === 0) return 100;
  return 100 - (100 / (1 + gains / losses));
}

function analyzeCoin(coin, chartPoints) {
  const { marketCap, liquidity, volume24h, changePercent } = coin;
  const hasDexData = marketCap != null || liquidity != null || volume24h != null;
  if (!hasDexData) return null;

  let score = 100;
  const risks = [], positives = [];

  // Market cap tier
  if (marketCap == null) {
    score -= 15;
  } else if (marketCap < 500_000) {
    score -= 40; risks.push('Micro-cap under $500K — extreme risk');
  } else if (marketCap < 5_000_000) {
    score -= 25; risks.push('Very small market cap — high volatility');
  } else if (marketCap < 50_000_000) {
    score -= 10; risks.push('Small-cap coin — speculative play');
  } else if (marketCap >= 500_000_000) {
    positives.push('Large market cap — relatively more established');
  } else {
    positives.push('Mid-cap — moderate risk profile');
  }

  // Liquidity
  if (liquidity == null) {
    score -= 10;
  } else if (liquidity < 20_000) {
    score -= 35; risks.push('Liquidity under $20K — high rug pull risk');
  } else if (liquidity < 100_000) {
    score -= 20; risks.push('Low liquidity — expect significant slippage');
  } else if (liquidity < 500_000) {
    score -= 5;
  } else {
    positives.push('Good liquidity — low slippage risk');
  }

  // Volume/MCap ratio
  if (marketCap && volume24h) {
    const ratio = volume24h / marketCap;
    if (ratio < 0.01) {
      score -= 15; risks.push('Very low trading volume — low market interest');
    } else if (ratio > 5) {
      score -= 10; risks.push('Unusually high volume ratio — possible manipulation');
    } else if (ratio > 0.05) {
      positives.push('Healthy trading volume relative to market cap');
    }
  }

  // Extreme 24h price moves
  if (changePercent != null) {
    if (changePercent > 200)     { score -= 20; risks.push('Parabolic pump (+200% 24h) — very high dump risk'); }
    else if (changePercent > 80) { score -= 10; risks.push('Large pump today — wait for cooldown before buying'); }
    else if (changePercent < -60){ score -= 10; risks.push('Severe crash today — wait for stabilization'); }
  }

  score = Math.max(0, Math.min(100, score));

  let safetyLabel, safetyColor, safetyIcon;
  if      (score >= 70) { safetyLabel = 'Lower Risk';     safetyColor = '#22c55e'; safetyIcon = '🛡️'; }
  else if (score >= 45) { safetyLabel = 'Moderate Risk';  safetyColor = '#f59e0b'; safetyIcon = '⚠️'; }
  else if (score >= 25) { safetyLabel = 'High Risk';      safetyColor = '#f97316'; safetyIcon = '🚨'; }
  else                  { safetyLabel = 'Very High Risk'; safetyColor = '#ef4444'; safetyIcon = '💀'; }

  // Chart-based signals
  let buySignal = null, exitSignal = null, trendLabel = null;

  if (chartPoints && chartPoints.length >= 5) {
    const closes = chartPoints.map((p) => p.close);
    const hi     = Math.max(...closes);
    const lo     = Math.min(...closes);
    const cur    = closes[closes.length - 1];
    const range  = hi - lo;
    const pctFromLow = range > 0 ? ((cur - lo) / range) * 100 : 50;
    const rsi    = calcRSI(closes);

    const q = Math.max(1, Math.floor(closes.length / 4));
    const earlyAvg = closes.slice(0, q).reduce((a, b) => a + b, 0) / q;
    const lateAvg  = closes.slice(-q).reduce((a, b) => a + b, 0) / q;
    const trendPct = earlyAvg > 0 ? ((lateAvg - earlyAvg) / earlyAvg) * 100 : 0;

    trendLabel = trendPct > 10 ? '📈 Uptrend' : trendPct < -10 ? '📉 Downtrend' : '➡️ Sideways';

    if (rsi != null && rsi < 32) {
      buySignal = { level: 'buy', text: `Oversold (RSI ${rsi.toFixed(0)}). Potential entry zone — use small position size and confirm reversal first.` };
    } else if (pctFromLow < 20) {
      buySignal = { level: 'buy', text: 'Price is near its recent low. Possible accumulation zone — look for a trend reversal signal before entering.' };
    } else if (pctFromLow > 80 || (rsi != null && rsi > 70)) {
      buySignal = { level: 'wait', text: `Price near recent highs${rsi != null ? ` (RSI ${rsi.toFixed(0)})` : ''}. Wait for a pullback to a better entry price.` };
    } else {
      buySignal = { level: 'neutral', text: 'No clear entry signal. Watch for a pullback toward the recent support zone before buying.' };
    }

    if (rsi != null && rsi > 75) {
      exitSignal = { level: 'exit', text: `RSI overbought (${rsi.toFixed(0)}). Consider taking 25–50% profit and moving stop-loss to breakeven.` };
    } else if (pctFromLow > 85) {
      exitSignal = { level: 'exit', text: 'Price is in the top 15% of its recent range. Good time to take partial profits.' };
    } else if (changePercent != null && changePercent > 80) {
      exitSignal = { level: 'exit', text: 'Up over 80% today — high risk of a sharp reversal. Consider scaling out.' };
    } else if (pctFromLow < 25) {
      exitSignal = { level: 'hold', text: 'Price near lows — not a great time to sell unless your thesis has changed.' };
    } else {
      exitSignal = { level: 'hold', text: 'No strong exit signal. Keep your stop-loss in place and let the position run.' };
    }

  } else if (changePercent != null) {
    if (changePercent > 80) {
      buySignal  = { level: 'wait', text: `Already up ${changePercent.toFixed(0)}% today. High risk of reversal — wait for a pullback.` };
      exitSignal = { level: 'exit', text: `Up ${changePercent.toFixed(0)}% in 24h — consider taking partial profits.` };
    } else if (changePercent < -30) {
      buySignal  = { level: 'buy',  text: `Down ${Math.abs(changePercent).toFixed(0)}% today. Possible dip opportunity — confirm the cause before entering.` };
      exitSignal = { level: 'hold', text: 'Already down sharply — selling here locks in losses. Wait for stabilization first.' };
    } else {
      buySignal  = { level: 'neutral', text: 'No chart history available. Use caution and size positions small on new coins.' };
      exitSignal = { level: 'hold',    text: 'Insufficient data for a clear exit signal. Monitor closely.' };
    }
  }

  return { score, safetyLabel, safetyColor, safetyIcon, risks, positives, trendLabel, buySignal, exitSignal };
}

// ── Safety card ───────────────────────────────────────────────────────────────

function SafetyCard({ analysis }) {
  const [expanded, setExpanded] = useState(false);
  if (!analysis) return null;
  const { safetyLabel, safetyColor, safetyIcon, score, risks, positives, trendLabel, buySignal, exitSignal } = analysis;

  const buyColors  = { buy: '#22c55e', wait: '#f59e0b', neutral: '#94a3b8' };
  const exitColors = { exit: '#f97316', hold: '#22c55e' };

  return (
    <div className="cd-section">
      <div className="cd-section-title">⚡ Safety &amp; Timing</div>
      <div className="cd-safety-card">

        {/* Safety badge + bar */}
        <div className="cd-safety-header">
          <span className="cd-safety-icon">{safetyIcon}</span>
          <div className="cd-safety-meta">
            <span className="cd-safety-label" style={{ color: safetyColor }}>{safetyLabel}</span>
            <div className="cd-safety-bar-track">
              <div className="cd-safety-bar-fill" style={{ width: score + '%', background: safetyColor }} />
            </div>
          </div>
          {trendLabel && <span className="cd-trend-badge">{trendLabel}</span>}
        </div>

        {/* Buy signal */}
        {buySignal && (
          <div className="cd-signal-block" style={{ borderLeftColor: buyColors[buySignal.level] }}>
            <div className="cd-signal-title" style={{ color: buyColors[buySignal.level] }}>🎯 When to Buy</div>
            <div className="cd-signal-text">{buySignal.text}</div>
          </div>
        )}

        {/* Exit signal */}
        {exitSignal && (
          <div className="cd-signal-block" style={{ borderLeftColor: exitColors[exitSignal.level] }}>
            <div className="cd-signal-title" style={{ color: exitColors[exitSignal.level] }}>🚪 When to Exit</div>
            <div className="cd-signal-text">{exitSignal.text}</div>
          </div>
        )}

        {/* Expandable factors */}
        {(risks.length > 0 || positives.length > 0) && (
          <>
            <button className="cd-factors-toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '▲ Hide factors' : `▼ Show risk factors (${risks.length} risk${risks.length !== 1 ? 's' : ''})`}
            </button>
            {expanded && (
              <div className="cd-factors">
                {risks.map((r, i) => <div key={i} className="cd-factor risk">⚠ {r}</div>)}
                {positives.map((p, i) => <div key={i} className="cd-factor positive">✓ {p}</div>)}
              </div>
            )}
          </>
        )}

        <div className="cd-disclaimer">Not financial advice. Always do your own research.</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CryptoDetail({ coin, onClose, onAddToPortfolio }) {
  // Default to 7D for meme/contract coins (more relevant short-term), 1M for majors
  const [rangeIdx, setRangeIdx]         = useState(coin.address ? 1 : 2);
  const [chartData, setChartData]       = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartUnavail, setChartUnavail] = useState(false);

  const { label: rangeLabel, days } = RANGES[rangeIdx];

  useEffect(() => {
    let cancelled = false;
    setChartLoading(true);
    setChartUnavail(false);
    setChartData(null);

    async function load() {
      // Try CoinGecko first (handles all known coins + auto-searches unknown ones)
      try {
        const data = await getCryptoChart(coin.symbol, days);
        if (!cancelled && data?.points?.length > 1) { setChartData(data); return; }
      } catch { /* fall through */ }

      // Fall back to DexScreener OHLCV for coins with a contract address
      if (coin.address && !cancelled) {
        try {
          const data = await getMemeChart(coin.address, coin.chainId || 'solana', days);
          if (!cancelled && data?.points?.length > 1) { setChartData(data); return; }
        } catch { /* fall through */ }
      }

      if (!cancelled) setChartUnavail(true);
    }

    load().finally(() => { if (!cancelled) setChartLoading(false); });
    return () => { cancelled = true; };
  }, [coin.symbol, coin.address, coin.chainId, days]);

  const isPos = (coin.changePercent ?? 0) >= 0;

  let periodChange = null, periodPct = null;
  if (chartData?.points?.length >= 2) {
    const first = chartData.points[0].close;
    const last  = chartData.points[chartData.points.length - 1].close;
    periodChange = last - first;
    periodPct    = ((last - first) / first) * 100;
  }
  const periodPos = (periodChange ?? 0) >= 0;

  const analysis = useMemo(
    () => analyzeCoin(coin, chartData?.points ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coin.symbol, coin.marketCap, coin.liquidity, coin.volume24h, coin.changePercent, chartData]
  );

  const isMeme = coin.address != null || coin.marketCap != null || coin.liquidity != null;

  return (
    <div className="crypto-detail">
      <div className="cd-header">
        <button className="cd-back" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="cd-header-badge" style={{ background: `${coin.color}22`, borderColor: `${coin.color}55` }}>
          <span style={{ color: coin.color, fontSize: 12, fontWeight: 800 }}>
            {(coin.symbol || '').slice(0, 4)}
          </span>
        </div>
        <div className="cd-header-info">
          <span className="cd-header-symbol">{coin.symbol}</span>
          <span className="cd-header-name">{coin.name}</span>
        </div>
        {onAddToPortfolio && (
          <button className="cd-add-portfolio" onClick={() => onAddToPortfolio(coin)}>
            + Portfolio
          </button>
        )}
      </div>

      <div className="cd-scroll">
        {/* Price hero */}
        <div className="cd-price-section">
          <div className="cd-price">{fmtPrice(coin.price)}</div>
          {coin.changePercent != null && (
            <div className={`cd-change ${isPos ? 'positive' : 'negative'}`}>
              {isPos ? '▲' : '▼'} {Math.abs(coin.changePercent).toFixed(2)}%
              <span className="cd-change-label"> 24h</span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="cd-chart-container">
          {chartLoading ? (
            <div className="cd-chart-loading">Loading chart…</div>
          ) : chartUnavail ? (
            <div className="cd-chart-loading">Chart not available for this coin</div>
          ) : (
            <StockChart points={chartData?.points} range={rangeLabel.toLowerCase()} />
          )}
        </div>

        {/* Period change */}
        {periodChange != null && (
          <div className={`cd-period-change ${periodPos ? 'positive' : 'negative'}`}>
            {periodPos ? '+' : ''}{fmtPrice(Math.abs(periodChange)).replace('$', '')}
            {' '}({periodPos ? '+' : ''}{periodPct.toFixed(2)}%)
            <span className="cd-period-label">{rangeLabel}</span>
          </div>
        )}

        {/* Range selector */}
        <div className="cd-range-bar">
          {RANGES.map((r, i) => (
            <button key={r.label} onClick={() => setRangeIdx(i)}
              className={`cd-range-btn ${rangeIdx === i ? 'active' : ''}`}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Safety & timing — only for meme/DeFi coins with market data */}
        {isMeme && <SafetyCard analysis={analysis} />}

        {/* Market stats */}
        {(coin.marketCap != null || coin.volume24h != null || coin.liquidity != null) && (
          <div className="cd-section">
            <div className="cd-section-title">Market Data</div>
            <div className="cd-stats-card">
              {coin.marketCap != null && (
                <div className="cd-stat-row">
                  <span className="cd-stat-label">Market Cap</span>
                  <span className="cd-stat-value">{fmtLarge(coin.marketCap)}</span>
                </div>
              )}
              {coin.volume24h != null && (
                <div className="cd-stat-row">
                  <span className="cd-stat-label">24h Volume</span>
                  <span className="cd-stat-value">{fmtLarge(coin.volume24h)}</span>
                </div>
              )}
              {coin.liquidity != null && (
                <div className="cd-stat-row">
                  <span className="cd-stat-label">Liquidity</span>
                  <span className="cd-stat-value">{fmtLarge(coin.liquidity)}</span>
                </div>
              )}
              {coin.chainId != null && (
                <div className="cd-stat-row">
                  <span className="cd-stat-label">Chain</span>
                  <span className="cd-stat-value" style={{ textTransform: 'capitalize' }}>{coin.chainId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
