import { useState, useEffect, useRef } from 'react';
import { searchSymbol } from '../services/stockService.js';

/**
 * Inline stock search bar.
 * onSelect({ symbol, name }) is called when the user picks a result.
 */
export default function StockSearch({ onSelect }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const debounceRef           = useRef(null);
  const inputRef              = useRef(null);

  /* auto-focus input when panel opens */
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else { setQuery(''); setResults([]); setError(''); }
  }, [open]);

  /* debounced search */
  useEffect(() => {
    if (!query.trim()) { setResults([]); setError(''); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const res = await searchSymbol(query);
        setResults(res?.slice(0, 8) ?? []);
        if (!res?.length) setError('No results found');
      } catch {
        setError('Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handleSelect(item) {
    setOpen(false);
    onSelect(item);
  }

  if (!open) {
    return (
      <button className="stock-search-btn" onClick={() => setOpen(true)} aria-label="Search stocks">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <line x1="13" y1="13" x2="18" y2="18" strokeLinecap="round" />
        </svg>
        Search
      </button>
    );
  }

  return (
    <div className="stock-search-panel">
      <div className="stock-search-row">
        <svg className="stock-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <line x1="13" y1="13" x2="18" y2="18" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          className="stock-search-input"
          type="text"
          placeholder="Search ticker or company…"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          autoCapitalize="characters"
        />
        {loading && <span className="stock-search-spinner" />}
        <button className="stock-search-cancel" onClick={() => setOpen(false)}>×</button>
      </div>

      {(results.length > 0 || error) && (
        <div className="stock-search-results">
          {error && !results.length ? (
            <div className="stock-search-empty">{error}</div>
          ) : (
            results.map((r) => (
              <button key={r.symbol} className="stock-search-result" onClick={() => handleSelect(r)}>
                <span className="stock-search-result-symbol">{r.symbol}</span>
                <span className="stock-search-result-name">{r.name}</span>
                {r.exchange && <span className="stock-search-result-exch">{r.exchange}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
