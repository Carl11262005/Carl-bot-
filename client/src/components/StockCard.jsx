import { useStockQuote } from '../hooks/useStockQuote.js';
import { useSparkline } from '../hooks/useSparkline.js';
import Sparkline from './Sparkline.jsx';

export default function StockCard({ stock, onRemove, onTap, onEdit }) {
  const { data, loading } = useStockQuote(stock.symbol);
  const { points, periodChange } = useSparkline(stock.symbol);

  const currentPrice = data?.price;
  const totalValue = currentPrice ? currentPrice * stock.shares : null;

  // Use the 1-month period change from the sparkline data (synced with the chart)
  // Falls back to the daily change from the quote if sparkline hasn't loaded yet
  let changePercent = null;
  let changeDollars = null;
  if (periodChange) {
    changePercent = periodChange.percent;
    changeDollars = periodChange.dollars;
  } else if (currentPrice) {
    changePercent = ((currentPrice - stock.buyPrice) / stock.buyPrice) * 100;
    changeDollars = currentPrice - stock.buyPrice;
  }

  const changeClass =
    changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : 'neutral';

  return (
    <div className="stock-card" onClick={onTap} style={{ cursor: 'pointer' }}>
      <div className="stock-card-left">
        <span className="stock-card-symbol">${stock.symbol}</span>
        <span className="stock-card-name">{stock.name}</span>
        <span className="stock-card-shares">
          {stock.shares} shares @ ${stock.buyPrice.toFixed(2)}
        </span>
      </div>

      {/* Sparkline mini chart */}
      <div className="stock-card-sparkline">
        <Sparkline points={points} width={72} height={32} />
      </div>

      <div className="stock-card-right">
        {loading ? (
          <span className="stock-card-price" style={{ color: 'var(--text-muted)' }}>
            ...
          </span>
        ) : currentPrice ? (
          <>
            <span className="stock-card-price">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`stock-card-change ${changeClass}`}>
              {changePercent >= 0 ? '+' : ''}
              {changePercent?.toFixed(2)}%
            </span>
            <span className="stock-card-period-label">1M</span>
          </>
        ) : (
          <span className="stock-card-price" style={{ color: 'var(--text-muted)' }}>
            N/A
          </span>
        )}
      </div>
      <button
        className="stock-card-edit"
        onClick={(e) => { e.stopPropagation(); onEdit?.(stock); }}
        aria-label={`Edit ${stock.symbol}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </button>
      <button
        className="stock-card-delete"
        onClick={(e) => { e.stopPropagation(); onRemove(stock.symbol); }}
        aria-label={`Remove ${stock.symbol}`}
      >
        &times;
      </button>
    </div>
  );
}
