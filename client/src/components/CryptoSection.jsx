import { useState, useCallback, useRef } from 'react';
import { useCoinbaseQuote } from '../hooks/useCoinbaseQuote.js';
import { useMemeQuote } from '../hooks/useMemeQuote.js';
import { useTrendingMemeCoins } from '../hooks/useTrendingMemeCoins.js';
import { getCryptoQuote, getMemeQuote } from '../services/cryptoService.js';

// ── Static lists ───────────────────────────────────────────────────────────────

export const CRYPTOS = [
  { symbol: 'BTC',   name: 'Bitcoin',       color: '#f7931a' },
  { symbol: 'ETH',   name: 'Ethereum',      color: '#627eea' },
  { symbol: 'SOL',   name: 'Solana',        color: '#9945ff' },
  { symbol: 'BNB',   name: 'BNB',           color: '#f3ba2f' },
  { symbol: 'XRP',   name: 'XRP',           color: '#346aa9' },
  { symbol: 'ADA',   name: 'Cardano',       color: '#0033ad' },
  { symbol: 'AVAX',  name: 'Avalanche',     color: '#e84142' },
  { symbol: 'TON',   name: 'Toncoin',       color: '#0088cc' },
  { symbol: 'TRX',   name: 'TRON',          color: '#ff0013' },
  { symbol: 'LINK',  name: 'Chainlink',     color: '#2a5ada' },
  { symbol: 'DOT',   name: 'Polkadot',      color: '#e6007a' },
  { symbol: 'MATIC', name: 'Polygon',       color: '#8247e5' },
  { symbol: 'HBAR',  name: 'Hedera',        color: '#00b388' },
  { symbol: 'ICP',   name: 'Internet Comp', color: '#29abe2' },
  { symbol: 'ARB',   name: 'Arbitrum',      color: '#28a0f0' },
  { symbol: 'OP',    name: 'Optimism',      color: '#ff0420' },
  { symbol: 'ATOM',  name: 'Cosmos',        color: '#2e3148' },
  { symbol: 'UNI',   name: 'Uniswap',       color: '#ff007a' },
  { symbol: 'NEAR',  name: 'NEAR',          color: '#00c08b' },
  { symbol: 'AAVE',  name: 'Aave',          color: '#b6509e' },
  { symbol: 'LTC',   name: 'Litecoin',      color: '#bfbbbb' },
  { symbol: 'SUI',   name: 'Sui',           color: '#4da2ff' },
  { symbol: 'FTM',   name: 'Fantom',        color: '#1969ff' },
  { symbol: 'RUNE',  name: 'THORChain',     color: '#33ff99' },
  { symbol: 'MKR',   name: 'Maker',         color: '#1aab9b' },
];

export const MEME_COINS = [
  { symbol: 'DOGE',     name: 'Dogecoin',     color: '#c2a633' },
  { symbol: 'SHIB',     name: 'Shiba Inu',    color: '#e0461b' },
  { symbol: 'PEPE',     name: 'Pepe',         color: '#4caf50' },
  { symbol: 'WIF',      name: 'dogwifhat',    color: '#b37feb' },
  { symbol: 'BONK',     name: 'Bonk',         color: '#f7871f' },
  { symbol: 'FLOKI',    name: 'Floki',        color: '#f5941d' },
  { symbol: 'POPCAT',   name: 'Popcat',       color: '#ff6b9d' },
  { symbol: 'BRETT',    name: 'Brett',        color: '#4169e1' },
  { symbol: 'TURBO',    name: 'Turbo',        color: '#00d4aa' },
  { symbol: 'MEW',      name: 'cat in a dog', color: '#ff9500' },
  { symbol: 'BOME',     name: 'Book of Meme', color: '#ff4500' },
  { symbol: 'MOODENG',  name: 'Moo Deng',     color: '#ff69b4' },
  { symbol: 'TRUMP',    name: 'TRUMP',        color: '#b8860b' },
  { symbol: 'FARTCOIN', name: 'Fartcoin',     color: '#8fbc8f' },
  { symbol: 'MOG',      name: 'Mog Coin',     color: '#9b59b6' },
];

// ── Price formatter ────────────────────────────────────────────────────────────

function fmtPrice(price) {
  if (price == null) return '—';
  if (price >= 10_000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1_000)  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)      return '$' + price.toFixed(2);
  if (price >= 0.01)   return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);
  return '$' + price.toPrecision(3);
}

// ── Shared card shell ──────────────────────────────────────────────────────────

function CardShell({ symbol, name, color, price, change, loading, onTap, onRemove }) {
  const isPos = change > 0;
  const isNeg = change < 0;
  return (
    <div
      className="crypto-card"
      style={{ cursor: onTap ? 'pointer' : 'default' }}
      onClick={onTap}
    >
      <div
        className="crypto-card-badge"
        style={{ background: `linear-gradient(135deg,${color}cc,${color}44)`, borderColor: `${color}44` }}
      >
        <span style={{ color, fontSize: 11, fontWeight: 800 }}>{symbol.slice(0, 4)}</span>
      </div>
      <div className="crypto-card-info">
        <span className="crypto-card-short">{symbol}</span>
        <span className="crypto-card-name">{name}</span>
      </div>
      <div className="crypto-card-prices">
        {loading && price == null ? (
          <span className="crypto-card-price loading">—</span>
        ) : (
          <>
            <span className="crypto-card-price">{fmtPrice(price)}</span>
            {change != null && (
              <span className={`crypto-card-change ${isPos ? 'positive' : isNeg ? 'negative' : 'neutral'}`}>
                {isPos ? '▲' : isNeg ? '▼' : '▬'} {Math.abs(change).toFixed(2)}%
              </span>
            )}
          </>
        )}
      </div>
      {onRemove && (
        <button
          className="crypto-card-remove"
          onClick={(e) => { e.stopPropagation(); onRemove(symbol); }}
          aria-label={`Remove ${symbol}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Coinbase card ──────────────────────────────────────────────────────────────

function CryptoCard({ coin, index, onTap, onRemove }) {
  const { data, loading } = useCoinbaseQuote(coin.symbol, { refreshMs: 60_000, delayMs: index * 200 });
  return (
    <CardShell
      symbol={coin.symbol}
      name={coin.name}
      color={coin.color}
      price={data?.price}
      change={data?.changePercent}
      loading={loading}
      onTap={onTap ? () => onTap({ ...coin, price: data?.price, changePercent: data?.changePercent }) : undefined}
      onRemove={onRemove}
    />
  );
}

// ── DexScreener card (meme coins) ─────────────────────────────────────────────

function MemeCard({ coin, index, onTap, onRemove }) {
  const { data, loading } = useMemeQuote(coin.symbol, { refreshMs: 60_000, delayMs: index * 200 });
  return (
    <CardShell
      symbol={coin.symbol}
      name={coin.name}
      color={coin.color}
      price={data?.price}
      change={data?.changePercent}
      loading={loading}
      onTap={onTap ? () => onTap({
        ...coin,
        price:         data?.price,
        changePercent: data?.changePercent,
        marketCap:     data?.marketCap,
        volume24h:     data?.volume24h,
        liquidity:     data?.liquidity,
        address:       data?.address,
        chainId:       data?.chainId,
      }) : undefined}
      onRemove={onRemove}
    />
  );
}

// ── Dynamic Moonshot card ──────────────────────────────────────────────────────

function TrendingCard({ coin, onTap }) {
  const hue   = coin.address ? (parseInt(coin.address.slice(2, 6), 16) % 360) : 200;
  const color = `hsl(${hue},70%,60%)`;
  return (
    <CardShell
      symbol={coin.symbol}
      name={coin.name?.slice(0, 12)}
      color={color}
      price={coin.price}
      change={coin.changePercent}
      loading={false}
      onTap={onTap ? () => onTap({ ...coin, color, name: coin.name?.slice(0, 12) }) : undefined}
    />
  );
}

// ── Async-validating search bar ────────────────────────────────────────────────

function SearchBar({ placeholder, onAdd }) {
  const [open, setOpen]     = useState(false);
  const [input, setInput]   = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'error'
  const [found, setFound]   = useState(null);   // { name, price } from validation
  const abortRef            = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setInput('');
    setStatus('idle');
    setFound(null);
  }, []);

  const submit = useCallback(async () => {
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    if (abortRef.current) abortRef.current = true;
    abortRef.current = false;
    setStatus('loading');
    setFound(null);
    try {
      const result = await onAdd(sym);
      if (abortRef.current) return;
      if (result?.found) {
        setFound(result.found);
        // Short flash then close
        setTimeout(close, 900);
      } else {
        setStatus('error');
      }
    } catch {
      if (!abortRef.current) setStatus('error');
    }
  }, [input, onAdd, close]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close();
  }, [submit, close]);

  return (
    <div className="crypto-search-bar">
      {open ? (
        <>
          <input
            className={`crypto-search-input${status === 'error' ? ' error' : ''}`}
            value={input}
            onChange={(e) => { setInput(e.target.value.toUpperCase()); setStatus('idle'); setFound(null); }}
            onKeyDown={handleKey}
            placeholder={placeholder}
            autoFocus
            maxLength={14}
            disabled={status === 'loading'}
          />
          <button className="crypto-search-go" onClick={submit} disabled={status === 'loading' || !input}>
            {status === 'loading' ? '…' : '+'}
          </button>
          <button className="crypto-search-cancel" onClick={close}>×</button>
          {status === 'error' && <span className="crypto-search-msg error">Not found</span>}
          {found && <span className="crypto-search-msg found">✓ {found.name} {fmtPrice(found.price)}</span>}
        </>
      ) : (
        <button className="crypto-search-open" onClick={() => setOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Search
        </button>
      )}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ title, accent, onSearch, searchPlaceholder }) {
  return (
    <div className="crypto-section-header">
      <span className="crypto-section-title" style={{ '--section-accent': accent }}>{title}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onSearch && <SearchBar placeholder={searchPlaceholder} onAdd={onSearch} />}
        <span className="crypto-section-live">● LIVE</span>
      </div>
    </div>
  );
}

// ── localStorage helpers ───────────────────────────────────────────────────────

const LS_EXTRA_CRYPTO = 'carlbot_extra_crypto';
const LS_EXTRA_MEME   = 'carlbot_extra_meme';

function loadExtra(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

// ── Exported section components ────────────────────────────────────────────────

/** Major cryptos — live prices via Coinbase */
export function CryptoSection({ onTap }) {
  const [extras, setExtras] = useState(() => loadExtra(LS_EXTRA_CRYPTO));

  async function addCoin(symbol) {
    if (CRYPTOS.some((c) => c.symbol === symbol)) return { found: CRYPTOS.find(c => c.symbol === symbol) };
    if (extras.some((c) => c.symbol === symbol)) return { found: extras.find(c => c.symbol === symbol) };
    try {
      const data = await getCryptoQuote(symbol);
      if (!data?.price) return false;
      const coin = { symbol: data.symbol || symbol, name: symbol, color: '#3b82f6' };
      const updated = [...extras, coin];
      setExtras(updated);
      localStorage.setItem(LS_EXTRA_CRYPTO, JSON.stringify(updated));
      return { found: { name: symbol, price: data.price } };
    } catch {
      return false;
    }
  }

  function removeCoin(symbol) {
    const updated = extras.filter((c) => c.symbol !== symbol);
    setExtras(updated);
    localStorage.setItem(LS_EXTRA_CRYPTO, JSON.stringify(updated));
  }

  return (
    <div className="crypto-section">
      <SectionHeader title="Crypto" accent="#3b82f6" onSearch={addCoin} searchPlaceholder="e.g. UNI, HBAR" />
      <div className="crypto-cards-row">
        {CRYPTOS.map((c, i) => (
          <CryptoCard key={c.symbol} coin={c} index={i} onTap={onTap} />
        ))}
        {extras.map((c, i) => (
          <CryptoCard key={c.symbol} coin={c} index={CRYPTOS.length + i} onTap={onTap} onRemove={removeCoin} />
        ))}
      </div>
    </div>
  );
}

/** Meme coins — live prices via DexScreener + Moonshot trending integrated */
export function MemeSection({ onTap }) {
  const [extras, setExtras] = useState(() => loadExtra(LS_EXTRA_MEME));
  const { coins: trending }  = useTrendingMemeCoins();

  // Trending coins not already in static list or extras
  const staticSymbols  = new Set(MEME_COINS.map((c) => c.symbol));
  const extraSymbols   = new Set(extras.map((c) => c.symbol));
  const moonshot = trending.filter((t) => !staticSymbols.has(t.symbol) && !extraSymbols.has(t.symbol));

  async function addCoin(symbol) {
    if (MEME_COINS.some((c) => c.symbol === symbol)) return { found: MEME_COINS.find(c => c.symbol === symbol) };
    if (extras.some((c) => c.symbol === symbol)) return { found: extras.find(c => c.symbol === symbol) };
    try {
      const data = await getMemeQuote(symbol);
      if (!data?.price) return false;
      const coin = { symbol: data.symbol || symbol, name: data.name || symbol, color: '#22c55e' };
      const updated = [...extras, coin];
      setExtras(updated);
      localStorage.setItem(LS_EXTRA_MEME, JSON.stringify(updated));
      return { found: { name: data.name || symbol, price: data.price } };
    } catch {
      return false;
    }
  }

  function removeCoin(symbol) {
    const updated = extras.filter((c) => c.symbol !== symbol);
    setExtras(updated);
    localStorage.setItem(LS_EXTRA_MEME, JSON.stringify(updated));
  }

  return (
    <div className="crypto-section">
      <SectionHeader title="Meme Coins" accent="#22c55e" onSearch={addCoin} searchPlaceholder="e.g. POPCAT, NEIRO" />
      <div className="crypto-cards-row">
        {MEME_COINS.map((c, i) => (
          <MemeCard key={c.symbol} coin={c} index={i} onTap={onTap} />
        ))}
        {extras.map((c, i) => (
          <MemeCard key={c.symbol} coin={c} index={MEME_COINS.length + i} onTap={onTap} onRemove={removeCoin} />
        ))}
        {/* Live Moonshot trending — fills in automatically as coins trend */}
        {moonshot.slice(0, 15).map((c) => (
          <TrendingCard key={c.address} coin={c} onTap={onTap} />
        ))}
      </div>
    </div>
  );
}

/** Trending on Moonshot — top boosted tokens, auto-discovered */
export function MoonshotSection({ onTap }) {
  const { coins, loading } = useTrendingMemeCoins();
  if (loading && coins.length === 0) return null;
  if (coins.length === 0) return null;

  return (
    <div className="crypto-section">
      <SectionHeader title="🌙 Trending on Moonshot" accent="#a855f7" />
      <div className="crypto-cards-row">
        {coins.slice(0, 20).map((c) => (
          <TrendingCard key={c.address} coin={c} onTap={onTap} />
        ))}
      </div>
    </div>
  );
}
