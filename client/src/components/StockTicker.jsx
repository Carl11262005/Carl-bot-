import { useStockQuote } from '../hooks/useStockQuote.js';

// Curated list of popular market symbols shown alongside the user's portfolio
const POPULAR_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META',
  'NFLX', 'AMD', 'JPM', 'V', 'DIS', 'SPY', 'QQQ', 'BA',
  'INTC', 'CRM', 'UBER', 'PYPL', 'BABA',
];

function TickerItem({ symbol, index }) {
  // Stagger initial fetches by 250 ms each; refresh every 60 s to stay within rate limits
  const { data } = useStockQuote(symbol, { refreshMs: 60_000, delayMs: index * 250 });
  const price = data?.price;
  const change = data?.changePercent;
  const isPos = change > 0;
  const isNeg = change < 0;

  return (
    <span className="ticker-item">
      <span className="ticker-symbol">${symbol}</span>
      {price != null ? (
        <>
          <span className="ticker-price">${price.toFixed(2)}</span>
          <span className={`ticker-change ${isPos ? 'positive' : isNeg ? 'negative' : 'neutral'}`}>
            {isPos ? '▲' : isNeg ? '▼' : '▬'}
            {Math.abs(change ?? 0).toFixed(2)}%
          </span>
        </>
      ) : (
        <span className="ticker-loading">—</span>
      )}
      <span className="ticker-sep">·</span>
    </span>
  );
}

export default function StockTicker({ portfolio }) {
  // Merge portfolio symbols first, then fill with popular ones (no duplicates)
  const portfolioSymbols = portfolio.map((s) => s.symbol);
  const allSymbols = [
    ...portfolioSymbols,
    ...POPULAR_SYMBOLS.filter((s) => !portfolioSymbols.includes(s)),
  ];

  if (allSymbols.length === 0) return null;

  // Create enough copies to fill the screen and allow seamless looping.
  // We need an even number of copies; copy[n] === copy[n + total/2] for -50%→0 loop.
  const copies = allSymbols.length < 6 ? 4 : 2;
  const sets = Array.from({ length: copies }, (_, ci) =>
    allSymbols.map((sym) => ({ sym, key: `${ci}-${sym}` }))
  ).flat();

  // Speed: ~3 s per symbol, min 15 s total
  const duration = Math.max(15, allSymbols.length * 3);

  return (
    <div className="stock-ticker">
      <div className="ticker-fade-left" />
      <div className="ticker-fade-right" />
      <div className="ticker-track" style={{ animationDuration: `${duration}s` }}>
        {sets.map(({ sym, key }, idx) => (
          // Only mount the real hook for the FIRST copy; duplicate copies share the same index
          <TickerItem key={key} symbol={sym} index={idx % allSymbols.length} />
        ))}
      </div>
    </div>
  );
}
