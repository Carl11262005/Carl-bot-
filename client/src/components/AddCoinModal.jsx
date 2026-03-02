import { useState } from 'react';
import { getCryptoQuote, getMemeQuote } from '../services/cryptoService.js';

function fmtPrice(price) {
  if (price == null) return '—';
  if (price >= 10_000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1_000)  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)      return '$' + price.toFixed(2);
  if (price >= 0.01)   return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toPrecision(3);
}

/**
 * Modal for adding a crypto or meme coin to your portfolio.
 *
 * Props:
 *   initialCoin  — pre-filled coin data from CryptoDetail (optional)
 *   initialType  — 'crypto' | 'meme' (optional, defaults to 'crypto')
 *   onAdd(entry) — called with the complete holding entry
 *   onClose()
 */
export default function AddCoinModal({ initialCoin, initialType, onAdd, onClose }) {
  const guessedType = initialType
    || (initialCoin?.address ? 'meme' : 'crypto');

  const [type, setType]           = useState(guessedType);
  const [symbol, setSymbol]       = useState(initialCoin?.symbol || '');
  const [coinData, setCoinData]   = useState(initialCoin || null);
  const [amount, setAmount]       = useState('');
  const [buyPrice, setBuyPrice]   = useState(() => {
    const p = initialCoin?.price;
    if (!p) return '';
    return p >= 1 ? p.toFixed(2) : p.toPrecision(4);
  });
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  async function findCoin() {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setSearching(true);
    setSearchErr('');
    setCoinData(null);
    try {
      const data = type === 'crypto'
        ? await getCryptoQuote(sym)
        : await getMemeQuote(sym);
      if (!data?.price) { setSearchErr('Coin not found — try another symbol.'); return; }
      setCoinData(data);
      const p = data.price;
      setBuyPrice(p >= 1 ? p.toFixed(2) : p.toPrecision(4));
    } catch {
      setSearchErr('Coin not found — try another symbol.');
    } finally {
      setSearching(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const resolved = coinData || initialCoin;
    if (!resolved || !parseFloat(amount) || !parseFloat(buyPrice)) return;
    onAdd({
      symbol:   resolved.symbol?.toUpperCase() || symbol.toUpperCase(),
      name:     resolved.name || resolved.symbol || symbol,
      color:    initialCoin?.color || (type === 'crypto' ? '#3b82f6' : '#22c55e'),
      type,
      amount:   parseFloat(amount),
      buyPrice: parseFloat(buyPrice),
      address:  resolved.address,
      chainId:  resolved.chainId,
    });
    onClose();
  }

  const resolved   = coinData || (initialCoin || null);
  const canSubmit  = resolved && parseFloat(amount) > 0 && parseFloat(buyPrice) > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Portfolio</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Type tabs — only when not pre-filled from detail view */}
        {!initialCoin && (
          <div className="coin-type-tabs">
            <button
              type="button"
              className={`coin-type-tab${type === 'crypto' ? ' active' : ''}`}
              onClick={() => { setType('crypto'); setCoinData(null); setSearchErr(''); }}
            >
              ₿ Crypto
            </button>
            <button
              type="button"
              className={`coin-type-tab${type === 'meme' ? ' active' : ''}`}
              onClick={() => { setType('meme'); setCoinData(null); setSearchErr(''); }}
            >
              🐸 Meme Coin
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Symbol search — skip when coin is pre-filled */}
          {!initialCoin && (
            <div className="modal-field">
              <label>Symbol</label>
              <div className="coin-search-row">
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => {
                    setSymbol(e.target.value.toUpperCase());
                    setCoinData(null);
                    setSearchErr('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), findCoin())}
                  placeholder={type === 'crypto' ? 'e.g. ETH, SOL' : 'e.g. PEPE, POPCAT'}
                  autoFocus
                />
                <button
                  type="button"
                  className="coin-search-find-btn"
                  onClick={findCoin}
                  disabled={searching || !symbol}
                >
                  {searching ? '…' : 'Find'}
                </button>
              </div>
              {searchErr && <div className="coin-search-error">{searchErr}</div>}
              {coinData && (
                <div className="coin-search-found-badge">
                  ✓ {coinData.name || coinData.symbol} — {fmtPrice(coinData.price)}
                </div>
              )}
            </div>
          )}

          {/* Pre-filled coin banner */}
          {initialCoin && (
            <div className="coin-prefill-row">
              <div
                className="coin-prefill-badge"
                style={{ background: `${initialCoin.color}22`, borderColor: `${initialCoin.color}55` }}
              >
                <span style={{ color: initialCoin.color, fontWeight: 800 }}>
                  {initialCoin.symbol}
                </span>
              </div>
              <div className="coin-prefill-info">
                <span className="coin-prefill-name">{initialCoin.name}</span>
                <span className="coin-prefill-price">{fmtPrice(initialCoin.price)}</span>
              </div>
            </div>
          )}

          <div className="modal-field">
            <label>Amount (quantity)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 0.05"
              min="0"
              step="any"
              autoFocus={!!initialCoin}
            />
          </div>

          <div className="modal-field">
            <label>
              Buy Price ($)
              {coinData && !initialCoin && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                  auto-filled
                </span>
              )}
            </label>
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="e.g. 95000"
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
