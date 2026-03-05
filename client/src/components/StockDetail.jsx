import { useState, useEffect, useRef, useMemo } from 'react';
import StockChart from './StockChart.jsx';
import { getQuote, getChart } from '../services/stockService.js';
import '../styles/StockDetail.css';

const RANGES = ['1D', '1W', '1M', '3M', '1Y', 'MAX'];

function fmt(val, decimals = 2) {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toFixed(decimals);
}

function fmtLarge(val) {
  if (val == null || isNaN(val)) return '—';
  if (val >= 1e12) return (val / 1e12).toFixed(2) + 'T';
  if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
  if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
  return val.toLocaleString();
}

function fmtPct(val) {
  if (val == null || isNaN(val)) return '—';
  return (val * 100).toFixed(2) + '%';
}

// ── RSI calculator ────────────────────────────────────────────────────────────
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta; else losses -= delta;
  }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}

// ── Stock analysis engine ─────────────────────────────────────────────────────
function analyzeStock(quote, chartPoints) {
  if (!quote) return null;
  const { trailingPE, forwardPE, beta, fiftyDayAvg, twoHundredDayAvg,
          fiftyTwoWeekLow, fiftyTwoWeekHigh, volume, avgVolume,
          marketCap, dividendYield, price: quotePrice } = quote;
  const price = quotePrice;

  let score = 70; // stocks start neutral
  const risks = [], positives = [];

  // P/E assessment
  const pe = forwardPE ?? trailingPE;
  if (pe != null) {
    if (pe < 0)          { score -= 15; risks.push('Negative earnings (P/E < 0) — company is not currently profitable'); }
    else if (pe < 10)    { positives.push('Low P/E ratio — potentially undervalued or value stock'); }
    else if (pe <= 30)   { positives.push('Reasonable P/E — priced fairly relative to earnings'); }
    else if (pe <= 60)   { score -= 5;  risks.push(`High P/E of ${fmt(pe)} — growth expectations are priced in`); }
    else                 { score -= 12; risks.push(`Very high P/E of ${fmt(pe)} — highly speculative valuation`); }
  }

  // Beta (volatility)
  if (beta != null) {
    if (beta < 0.5)      { positives.push('Low beta — less volatile than the overall market'); }
    else if (beta <= 1.3){ positives.push('Stable beta — moves roughly in line with the market'); }
    else if (beta <= 2)  { score -= 5; risks.push(`High beta (${fmt(beta)}) — more volatile than the market`); }
    else                 { score -= 10; risks.push(`Very high beta (${fmt(beta)}) — highly volatile stock`); }
  }

  // Dividend
  if (dividendYield != null && dividendYield > 0) {
    positives.push(`Pays dividends (${fmtPct(dividendYield)} yield) — income + price appreciation potential`);
  }

  // Moving average position
  if (price != null && fiftyDayAvg != null) {
    if (price > fiftyDayAvg * 1.05) { positives.push('Trading above 50-day avg — short-term uptrend'); }
    else if (price < fiftyDayAvg * 0.95) { score -= 8; risks.push('Trading below 50-day avg — short-term weakness'); }
  }
  if (price != null && twoHundredDayAvg != null) {
    if (price > twoHundredDayAvg * 1.05) { positives.push('Above 200-day avg — long-term uptrend intact'); }
    else if (price < twoHundredDayAvg * 0.95) { score -= 10; risks.push('Below 200-day avg — long-term downtrend'); }
  }

  // Volume vs average
  if (volume != null && avgVolume != null && avgVolume > 0) {
    const volRatio = volume / avgVolume;
    if (volRatio > 2) { positives.push('High volume today — strong market interest'); }
    else if (volRatio < 0.3) { score -= 5; risks.push('Very low volume — thin market, easier to move price'); }
  }

  score = Math.max(0, Math.min(100, score));

  let qualityLabel, qualityColor, qualityIcon;
  if      (score >= 70) { qualityLabel = 'Solid Fundamentals'; qualityColor = '#22c55e'; qualityIcon = '📊'; }
  else if (score >= 50) { qualityLabel = 'Mixed Signals';      qualityColor = '#f59e0b'; qualityIcon = '⚠️'; }
  else                  { qualityLabel = 'Risky Setup';        qualityColor = '#ef4444'; qualityIcon = '🚨'; }

  // Chart-based signals
  let buySignal = null, exitSignal = null, trendLabel = null;

  const w52Pct = (fiftyTwoWeekLow != null && fiftyTwoWeekHigh != null && price != null && fiftyTwoWeekHigh !== fiftyTwoWeekLow)
    ? ((price - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow)) * 100
    : null;

  if (chartPoints && chartPoints.length >= 5) {
    const closes = chartPoints.map((p) => p.close);
    const rsi    = calcRSI(closes);
    const hi     = Math.max(...closes);
    const lo     = Math.min(...closes);
    const cur    = closes[closes.length - 1];
    const range  = hi - lo;
    const pctFromLow = range > 0 ? ((cur - lo) / range) * 100 : 50;

    const q = Math.max(1, Math.floor(closes.length / 4));
    const earlyAvg = closes.slice(0, q).reduce((a, b) => a + b, 0) / q;
    const lateAvg  = closes.slice(-q).reduce((a, b) => a + b, 0) / q;
    const trendPct = earlyAvg > 0 ? ((lateAvg - earlyAvg) / earlyAvg) * 100 : 0;
    trendLabel = trendPct > 8 ? '📈 Uptrend' : trendPct < -8 ? '📉 Downtrend' : '➡️ Sideways';

    // Buy signal
    if (rsi != null && rsi < 32) {
      buySignal = { level: 'buy', text: `RSI oversold (${rsi.toFixed(0)}). Stock may be due for a bounce — watch for a reversal confirmation before entering.` };
    } else if ((w52Pct != null && w52Pct < 12) || pctFromLow < 15) {
      buySignal = { level: 'buy', text: 'Price near its 52-week or period low. Potential value entry — confirm with fundamentals before adding.' };
    } else if (rsi != null && rsi > 72) {
      buySignal = { level: 'wait', text: `RSI overbought (${rsi.toFixed(0)}). Wait for a pullback to a lower entry before buying more.` };
    } else if (w52Pct != null && w52Pct > 92) {
      buySignal = { level: 'wait', text: 'Near 52-week high. Good momentum but high entry risk — consider a smaller position or wait for a dip.' };
    } else {
      buySignal = { level: 'neutral', text: 'No extreme entry signal. Consider dollar-cost averaging in gradually rather than entering all at once.' };
    }

    // Exit signal
    if (rsi != null && rsi > 78) {
      exitSignal = { level: 'exit', text: `RSI very overbought (${rsi.toFixed(0)}). Consider taking partial profits and tightening your stop-loss.` };
    } else if (w52Pct != null && w52Pct > 95) {
      exitSignal = { level: 'exit', text: 'Near 52-week high. Good time to take some profit — consider selling 25–50% of the position.' };
    } else if (rsi != null && rsi < 25) {
      exitSignal = { level: 'hold', text: `RSI oversold (${rsi.toFixed(0)}) — not a good time to sell. Give the position time to recover.` };
    } else if (price != null && twoHundredDayAvg != null && price < twoHundredDayAvg * 0.9) {
      exitSignal = { level: 'exit', text: '10%+ below 200-day average — consider cutting the position if your thesis has changed.' };
    } else {
      exitSignal = { level: 'hold', text: 'No strong exit signal. Keep your stop-loss in place and review position size relative to your portfolio.' };
    }
  } else if (w52Pct != null) {
    if (w52Pct < 15) {
      buySignal  = { level: 'buy',  text: 'Near 52-week low. Potential value entry — verify fundamentals haven\'t changed before buying.' };
      exitSignal = { level: 'hold', text: 'Near 52-week lows — selling here locks in losses. Wait for stabilization.' };
    } else if (w52Pct > 88) {
      buySignal  = { level: 'wait', text: 'Near 52-week high. Strong momentum but limited upside — wait for a pullback for better risk/reward.' };
      exitSignal = { level: 'exit', text: 'Near 52-week high — good time to take partial profits or tighten stop-loss.' };
    } else {
      buySignal  = { level: 'neutral', text: 'Mid-range in 52-week band. Consider a gradual entry rather than all at once.' };
      exitSignal = { level: 'hold', text: 'No strong exit signal. Monitor earnings and fundamentals for thesis changes.' };
    }
    trendLabel = w52Pct > 60 ? '📈 Above Midpoint' : '📉 Below Midpoint';
  } else {
    buySignal  = { level: 'neutral', text: 'Not enough price history to generate entry signals. Use fundamental analysis for this stock.' };
    exitSignal = { level: 'hold', text: 'Insufficient data for a timing signal. Review your thesis and position size.' };
  }

  return { score, qualityLabel, qualityColor, qualityIcon, risks, positives, trendLabel, buySignal, exitSignal };
}

// ── Signal card component ─────────────────────────────────────────────────────
function StockSignalCard({ analysis }) {
  const [expanded, setExpanded] = useState(false);
  if (!analysis) return null;
  const { qualityLabel, qualityColor, qualityIcon, score, risks, positives, trendLabel, buySignal, exitSignal } = analysis;

  const buyColors  = { buy: '#22c55e', wait: '#f59e0b', neutral: '#94a3b8' };
  const exitColors = { exit: '#f97316', hold: '#22c55e' };

  return (
    <div className="sd-section">
      <div className="sd-section-title">⚡ Analysis &amp; Timing</div>
      <div className="sd-signal-card">
        <div className="sd-signal-header">
          <span className="sd-signal-icon">{qualityIcon}</span>
          <div className="sd-signal-meta">
            <span className="sd-signal-label" style={{ color: qualityColor }}>{qualityLabel}</span>
            <div className="sd-signal-bar-track">
              <div className="sd-signal-bar-fill" style={{ width: score + '%', background: qualityColor }} />
            </div>
          </div>
          {trendLabel && <span className="sd-trend-badge">{trendLabel}</span>}
        </div>

        {buySignal && (
          <div className="sd-sig-block" style={{ borderLeftColor: buyColors[buySignal.level] }}>
            <div className="sd-sig-title" style={{ color: buyColors[buySignal.level] }}>🎯 When to Buy</div>
            <div className="sd-sig-text">{buySignal.text}</div>
          </div>
        )}

        {exitSignal && (
          <div className="sd-sig-block" style={{ borderLeftColor: exitColors[exitSignal.level] }}>
            <div className="sd-sig-title" style={{ color: exitColors[exitSignal.level] }}>🚪 When to Exit</div>
            <div className="sd-sig-text">{exitSignal.text}</div>
          </div>
        )}

        {(risks.length > 0 || positives.length > 0) && (
          <>
            <button className="sd-factors-toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? '▲ Hide factors' : `▼ Show factors (${risks.length} risk${risks.length !== 1 ? 's' : ''}, ${positives.length} positive${positives.length !== 1 ? 's' : ''})`}
            </button>
            {expanded && (
              <div className="sd-factors">
                {risks.map((r, i) => <div key={i} className="sd-factor risk">⚠ {r}</div>)}
                {positives.map((p, i) => <div key={i} className="sd-factor positive">✓ {p}</div>)}
              </div>
            )}
          </>
        )}

        <div className="sd-disclaimer">Not financial advice. Always do your own research.</div>
      </div>
    </div>
  );
}

export default function StockDetail({ stock, onClose, onAdd }) {
  const [range, setRange] = useState('1M');
  const [chartData, setChartData] = useState(null);
  const [quote, setQuote] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
  const quoteInterval = useRef(null);

  // Fetch quote and auto-refresh every 15 seconds
  useEffect(() => {
    let cancelled = false;
    async function fetchQuote() {
      try {
        const q = await getQuote(stock.symbol);
        if (!cancelled) setQuote(q);
      } catch {}
    }
    fetchQuote();
    quoteInterval.current = setInterval(fetchQuote, 15000);
    return () => {
      cancelled = true;
      clearInterval(quoteInterval.current);
    };
  }, [stock.symbol]);

  // Fetch chart data when range changes
  useEffect(() => {
    let cancelled = false;
    async function fetchChart() {
      setChartLoading(true);
      try {
        const data = await getChart(stock.symbol, range.toLowerCase());
        if (!cancelled) setChartData(data);
      } catch {
        if (!cancelled) setChartData(null);
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    fetchChart();
    return () => { cancelled = true; };
  }, [stock.symbol, range]);

  const analysis = useMemo(
    () => analyzeStock(quote, chartData?.points ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quote?.price, quote?.trailingPE, quote?.beta, quote?.fiftyDayAvg, quote?.twoHundredDayAvg, chartData]
  );

  const price = quote?.price;
  const dayChange = quote?.change;
  const dayPct = quote?.changePercent;
  const isPositive = dayChange >= 0;

  // Chart-based period change
  const points = chartData?.points;
  let periodChange = null;
  let periodPct = null;
  if (points && points.length >= 2) {
    const first = points[0].close;
    const last = points[points.length - 1].close;
    periodChange = last - first;
    periodPct = ((last - first) / first) * 100;
  }
  const periodPositive = periodChange >= 0;

  // Your position
  const totalValue = price ? price * stock.shares : null;
  const totalGain = price ? (price - stock.buyPrice) * stock.shares : null;
  const gainPct = price ? ((price - stock.buyPrice) / stock.buyPrice) * 100 : null;

  // After hours
  const afterHours = quote?.postMarketPrice || quote?.preMarketPrice;
  const afterHoursChange = quote?.postMarketChange || quote?.preMarketChange;
  const isAfterHours = quote?.marketState === 'POST' || quote?.marketState === 'PRE' || quote?.marketState === 'PREPRE' || quote?.marketState === 'POSTPOST';

  // 52-week range bar position
  const w52Low = quote?.fiftyTwoWeekLow;
  const w52High = quote?.fiftyTwoWeekHigh;
  const w52Pct = (w52Low != null && w52High != null && price != null && w52High !== w52Low)
    ? ((price - w52Low) / (w52High - w52Low)) * 100
    : null;

  // Day range bar position
  const dayLow = quote?.dayLow;
  const dayHigh = quote?.dayHigh;
  const dayRangePct = (dayLow != null && dayHigh != null && price != null && dayHigh !== dayLow)
    ? ((price - dayLow) / (dayHigh - dayLow)) * 100
    : null;

  return (
    <div className="stock-detail">
      {/* Header bar */}
      <div className="sd-header">
        <button className="sd-back" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="sd-header-info">
          <span className="sd-header-symbol">${stock.symbol}</span>
          <span className="sd-header-exchange">{quote?.exchange || ''}</span>
        </div>
      </div>

      <div className="sd-scroll">
        {/* Price hero */}
        <div className="sd-price-section">
          <div className="sd-company-name">{quote?.fullName || stock.name}</div>
          <div className="sd-price-row">
            <span className="sd-price">{price != null ? `$${fmt(price)}` : '...'}</span>
            <span className="sd-currency">{quote?.currency || 'USD'}</span>
          </div>
          {dayChange != null && (
            <div className={`sd-day-change ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '+' : ''}{fmt(dayChange)} ({isPositive ? '+' : ''}{fmt(dayPct)}%) Today
            </div>
          )}
          {isAfterHours && afterHours != null && (
            <div className="sd-after-hours">
              After Hours: ${fmt(afterHours)}
              <span className={afterHoursChange >= 0 ? 'positive' : 'negative'}>
                {' '}{afterHoursChange >= 0 ? '+' : ''}{fmt(afterHoursChange)}
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="sd-chart-container">
          {chartLoading ? (
            <div className="sd-chart-loading">Loading chart...</div>
          ) : (
            <StockChart points={chartData?.points} range={range.toLowerCase()} />
          )}
        </div>

        {/* Period change from chart */}
        {periodChange != null && (
          <div className={`sd-period-change ${periodPositive ? 'positive' : 'negative'}`}>
            {periodPositive ? '+' : ''}{fmt(periodChange)} ({periodPositive ? '+' : ''}{fmt(periodPct)}%)
            <span className="sd-period-label">{range}</span>
          </div>
        )}

        {/* Range selector */}
        <div className="sd-range-bar">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`sd-range-btn ${range === r ? 'active' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Investment Analysis */}
        <StockSignalCard analysis={analysis} />

        {/* Your Position — only shown for stocks already in portfolio */}
        {stock.shares != null ? (
          <div className="sd-section">
            <div className="sd-section-title">Your Position</div>
            <div className="sd-stats-card">
              <div className="sd-stat-row">
                <span className="sd-stat-label">Shares</span>
                <span className="sd-stat-value">{stock.shares}</span>
              </div>
              <div className="sd-stat-row">
                <span className="sd-stat-label">Avg Cost</span>
                <span className="sd-stat-value">${fmt(stock.buyPrice)}</span>
              </div>
              <div className="sd-stat-row">
                <span className="sd-stat-label">Market Value</span>
                <span className="sd-stat-value">{totalValue != null ? `$${fmtLarge(totalValue)}` : '—'}</span>
              </div>
              <div className="sd-stat-row sd-stat-highlight">
                <span className="sd-stat-label">Total Return</span>
                <span className={`sd-stat-value ${totalGain > 0 ? 'positive' : totalGain < 0 ? 'negative' : ''}`}>
                  {totalGain != null ? `${totalGain >= 0 ? '+' : ''}$${fmt(totalGain)} (${gainPct >= 0 ? '+' : ''}${fmt(gainPct)}%)` : '—'}
                </span>
              </div>
            </div>
          </div>
        ) : onAdd ? (
          <div className="sd-section">
            <button
              className="sd-add-btn"
              onClick={() => onAdd({ symbol: stock.symbol, name: stock.name || quote?.fullName || stock.symbol })}
            >
              + Add to Portfolio
            </button>
          </div>
        ) : null}

        {/* Key Statistics - like Apple/Robinhood */}
        <div className="sd-section">
          <div className="sd-section-title">Key Statistics</div>
          <div className="sd-stats-card">
            {/* Price Stats */}
            <div className="sd-stat-row">
              <span className="sd-stat-label">Open</span>
              <span className="sd-stat-value">{quote?.open != null ? `$${fmt(quote.open)}` : '—'}</span>
            </div>
            <div className="sd-stat-row">
              <span className="sd-stat-label">Previous Close</span>
              <span className="sd-stat-value">{quote?.previousClose != null ? `$${fmt(quote.previousClose)}` : '—'}</span>
            </div>

            {/* Day Range */}
            <div className="sd-stat-row sd-range-stat">
              <span className="sd-stat-label">Day Range</span>
              <div className="sd-range-display">
                <span className="sd-range-val">${fmt(dayLow)}</span>
                <div className="sd-range-track">
                  <div className="sd-range-fill" style={{ width: `${dayRangePct ?? 0}%` }} />
                  {dayRangePct != null && (
                    <div className="sd-range-dot" style={{ left: `${dayRangePct}%` }} />
                  )}
                </div>
                <span className="sd-range-val">${fmt(dayHigh)}</span>
              </div>
            </div>

            {/* 52-Week Range */}
            <div className="sd-stat-row sd-range-stat">
              <span className="sd-stat-label">52 Week Range</span>
              <div className="sd-range-display">
                <span className="sd-range-val">${fmt(w52Low)}</span>
                <div className="sd-range-track">
                  <div className="sd-range-fill" style={{ width: `${w52Pct ?? 0}%` }} />
                  {w52Pct != null && (
                    <div className="sd-range-dot" style={{ left: `${w52Pct}%` }} />
                  )}
                </div>
                <span className="sd-range-val">${fmt(w52High)}</span>
              </div>
            </div>

            <div className="sd-stat-divider" />

            {/* Volume */}
            <div className="sd-stat-row">
              <span className="sd-stat-label">Volume</span>
              <span className="sd-stat-value">{fmtLarge(quote?.volume)}</span>
            </div>
            <div className="sd-stat-row">
              <span className="sd-stat-label">Avg Volume</span>
              <span className="sd-stat-value">{fmtLarge(quote?.avgVolume)}</span>
            </div>
            <div className="sd-stat-row">
              <span className="sd-stat-label">Market Cap</span>
              <span className="sd-stat-value">{fmtLarge(quote?.marketCap)}</span>
            </div>
          </div>
        </div>

        {/* Fundamentals */}
        <div className="sd-section">
          <div className="sd-section-title">Fundamentals</div>
          <div className="sd-stats-grid">
            <div className="sd-grid-item">
              <span className="sd-grid-label">P/E (TTM)</span>
              <span className="sd-grid-value">{fmt(quote?.trailingPE)}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">P/E (Forward)</span>
              <span className="sd-grid-value">{fmt(quote?.forwardPE)}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">EPS (TTM)</span>
              <span className="sd-grid-value">{quote?.epsTrailing != null ? `$${fmt(quote.epsTrailing)}` : '—'}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">EPS (Forward)</span>
              <span className="sd-grid-value">{quote?.epsForward != null ? `$${fmt(quote.epsForward)}` : '—'}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">Price/Book</span>
              <span className="sd-grid-value">{fmt(quote?.priceToBook)}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">Book Value</span>
              <span className="sd-grid-value">{quote?.bookValue != null ? `$${fmt(quote.bookValue)}` : '—'}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">Dividend Yield</span>
              <span className="sd-grid-value">{quote?.dividendYield != null ? fmtPct(quote.dividendYield) : '—'}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">Dividend Rate</span>
              <span className="sd-grid-value">{quote?.dividendRate != null ? `$${fmt(quote.dividendRate)}` : '—'}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">Beta</span>
              <span className="sd-grid-value">{fmt(quote?.beta)}</span>
            </div>
            <div className="sd-grid-item">
              <span className="sd-grid-label">Shares Out</span>
              <span className="sd-grid-value">{fmtLarge(quote?.sharesOutstanding)}</span>
            </div>
          </div>
        </div>

        {/* Moving Averages */}
        <div className="sd-section">
          <div className="sd-section-title">Moving Averages</div>
          <div className="sd-stats-card">
            <div className="sd-stat-row">
              <span className="sd-stat-label">50-Day Avg</span>
              <div className="sd-stat-value-group">
                <span className="sd-stat-value">{quote?.fiftyDayAvg != null ? `$${fmt(quote.fiftyDayAvg)}` : '—'}</span>
                {quote?.fiftyDayChange != null && (
                  <span className={`sd-stat-badge ${quote.fiftyDayChange >= 0 ? 'positive' : 'negative'}`}>
                    {quote.fiftyDayChange >= 0 ? '+' : ''}{(quote.fiftyDayChange * 100).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <div className="sd-stat-row">
              <span className="sd-stat-label">200-Day Avg</span>
              <div className="sd-stat-value-group">
                <span className="sd-stat-value">{quote?.twoHundredDayAvg != null ? `$${fmt(quote.twoHundredDayAvg)}` : '—'}</span>
                {quote?.twoHundredDayChange != null && (
                  <span className={`sd-stat-badge ${quote.twoHundredDayChange >= 0 ? 'positive' : 'negative'}`}>
                    {quote.twoHundredDayChange >= 0 ? '+' : ''}{(quote.twoHundredDayChange * 100).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            {quote?.earningsTimestamp && (
              <div className="sd-stat-row">
                <span className="sd-stat-label">Earnings Date</span>
                <span className="sd-stat-value">
                  {new Date(quote.earningsTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
