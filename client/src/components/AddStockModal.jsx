import { useState, useEffect, useRef } from 'react';
import { searchSymbol, getQuote } from '../services/stockService.js';

export default function AddStockModal({ onAdd, onClose, initialSymbol = null }) {
  const [query, setQuery] = useState(initialSymbol?.symbol ?? '');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const debounceRef = useRef(null);

  /* Auto-select when opened with a pre-filled symbol */
  useEffect(() => {
    if (initialSymbol?.symbol) {
      handleSelect(initialSymbol);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!query || selected) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchSymbol(query);
        setResults(res);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query, selected]);

  async function handleSelect(item) {
    setSelected(item);
    setQuery(item.symbol);
    setResults([]);

    // Auto-fill current price
    setFetchingPrice(true);
    try {
      const quote = await getQuote(item.symbol);
      if (quote.price) {
        setBuyPrice(quote.price.toFixed(2));
      }
    } catch {
      // leave empty if fetch fails
    } finally {
      setFetchingPrice(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selected || !shares || !buyPrice) return;

    onAdd({
      symbol: selected.symbol,
      name: selected.name,
      shares: parseFloat(shares),
      buyPrice: parseFloat(buyPrice),
    });
    onClose();
  }

  const canSubmit = selected && parseFloat(shares) > 0 && parseFloat(buyPrice) > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Stock</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label>Ticker Symbol</label>
            <input
              type="text"
              placeholder="Search for a stock (e.g., AAPL)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value.toUpperCase());
                setSelected(null);
                setBuyPrice('');
              }}
              autoFocus={!initialSymbol}
            />
            {results.length > 0 && (
              <div className="search-results">
                {results.map((r) => (
                  <div
                    key={r.symbol}
                    className="search-result-item"
                    onClick={() => handleSelect(r)}
                  >
                    <span className="search-result-symbol">{r.symbol}</span>
                    <span className="search-result-name">{r.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-field">
            <label>Number of Shares</label>
            <input
              type="number"
              placeholder="e.g., 10"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              min="0"
              step="any"
              autoFocus={!!initialSymbol}
            />
          </div>

          <div className="modal-field">
            <label>
              Buy Price per Share ($)
              {fetchingPrice && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                  fetching...
                </span>
              )}
              {selected && !fetchingPrice && buyPrice && (
                <span style={{ color: 'var(--accent-light)', fontWeight: 400, marginLeft: 8 }}>
                  current price auto-filled
                </span>
              )}
            </label>
            <input
              type="number"
              placeholder="e.g., 150.00"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              min="0"
              step="any"
            />
          </div>

          <button type="submit" className="modal-submit" disabled={!canSubmit}>
            Add to Portfolio
          </button>
        </form>
      </div>
    </div>
  );
}
