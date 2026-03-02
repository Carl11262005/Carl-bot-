import { useState, useEffect, useRef } from 'react';
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

export default function StockDetail({ stock, onClose }) {
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

        {/* Your Position */}
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
