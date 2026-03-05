import { useCoinbaseQuote } from '../hooks/useCoinbaseQuote.js';
import { useMemeQuote } from '../hooks/useMemeQuote.js';
import '../styles/CryptoHoldings.css';

function fmtPrice(price) {
  if (price == null) return '—';
  if (price >= 10_000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1_000)  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)      return '$' + price.toFixed(2);
  if (price >= 0.01)   return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toPrecision(3);
}

function fmtValue(v) {
  if (v == null || isNaN(v)) return '—';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CoinHoldingCard({ holding, onTap, onRemove, onEdit }) {
  const isMeme = holding.type === 'meme';
  const { data: cbData }   = useCoinbaseQuote(!isMeme ? holding.symbol : null, { refreshMs: 60_000 });
  const { data: memeData } = useMemeQuote(isMeme ? holding.symbol : null, { refreshMs: 60_000 });

  const currentPrice  = isMeme ? memeData?.price : cbData?.price;
  const changePercent = isMeme ? memeData?.changePercent : cbData?.changePercent;
  const currentValue  = currentPrice != null ? holding.amount * currentPrice : null;
  const costBasis     = holding.amount * holding.buyPrice;
  const pnl           = currentValue != null ? currentValue - costBasis : null;
  const pnlPct        = pnl != null && costBasis > 0 ? (pnl / costBasis) * 100 : null;
  const isPos         = (pnl ?? 0) >= 0;

  return (
    <div
      className="coin-holding-card"
      onClick={() => onTap?.({ ...holding, price: currentPrice, changePercent })}
    >
      <div
        className="coin-holding-badge"
        style={{ background: `${holding.color}22`, borderColor: `${holding.color}55` }}
      >
        <span style={{ color: holding.color, fontSize: 10, fontWeight: 800 }}>
          {holding.symbol.slice(0, 4)}
        </span>
      </div>

      <div className="coin-holding-info">
        <span className="coin-holding-symbol">{holding.symbol}</span>
        <span className="coin-holding-amount">{holding.amount} {holding.amount === 1 ? 'coin' : 'coins'}</span>
      </div>

      <div className="coin-holding-values">
        <span className="coin-holding-value">{fmtValue(currentValue)}</span>
        <span className="coin-holding-price">{fmtPrice(currentPrice)}</span>
        {pnl != null && (
          <span className={`coin-holding-pnl ${isPos ? 'positive' : 'negative'}`}>
            {isPos ? '+' : ''}{fmtValue(Math.abs(pnl)).replace('$', '')} ({isPos ? '+' : ''}{pnlPct?.toFixed(2)}%)
          </span>
        )}
      </div>

      <button
        className="coin-holding-edit"
        onClick={(e) => { e.stopPropagation(); onEdit?.(holding); }}
        aria-label="Edit"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </button>
      <button
        className="coin-holding-remove"
        onClick={(e) => { e.stopPropagation(); onRemove(holding.id); }}
        aria-label="Remove"
      >
        ×
      </button>
    </div>
  );
}

export function CryptoHoldingsSection({ holdings, onTap, onRemove, onEdit, onAddNew }) {
  if (holdings.length === 0) return null;
  return (
    <div className="coin-holdings-section">
      <div className="coin-holdings-header">
        <span className="coin-holdings-title">Crypto Holdings</span>
        <button className="coin-holdings-add" onClick={onAddNew} aria-label="Add crypto">+</button>
      </div>
      <div className="coin-holdings-list">
        {holdings.map((h) => (
          <CoinHoldingCard key={h.id} holding={h} onTap={onTap} onRemove={onRemove} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

export function MemeHoldingsSection({ holdings, onTap, onRemove, onEdit, onAddNew }) {
  if (holdings.length === 0) return null;
  return (
    <div className="coin-holdings-section">
      <div className="coin-holdings-header">
        <span className="coin-holdings-title">Meme Coin Holdings</span>
        <button className="coin-holdings-add" onClick={onAddNew} aria-label="Add meme coin">+</button>
      </div>
      <div className="coin-holdings-list">
        {holdings.map((h) => (
          <CoinHoldingCard key={h.id} holding={h} onTap={onTap} onRemove={onRemove} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}
