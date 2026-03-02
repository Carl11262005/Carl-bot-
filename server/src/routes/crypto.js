/**
 * /api/crypto — Live prices from Coinbase public REST API (no API key needed)
 *
 * GET /api/crypto/quote?symbol=BTC
 *   → spot price + 24 h change from Coinbase Exchange stats
 *
 * GET /api/crypto/batch?symbols=BTC,ETH,SOL
 *   → up to 10 symbols at once (runs queries in parallel)
 */

import { Router } from 'express';

const router = Router();

// Simple in-process cache — avoids hammering Coinbase on every React refresh
const cache = new Map();
const TTL = 30_000; // 30 s

async function coinbaseFetch(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'CarlBot/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) throw new Error(`Coinbase ${res.status}: ${url}`);
  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

async function fetchCryptoQuote(base) {
  const sym = base.toUpperCase();
  const productId = `${sym}-USD`;

  // Spot price (always available)
  const spotUrl = `https://api.coinbase.com/v2/prices/${productId}/spot`;
  const spotData = await coinbaseFetch(spotUrl);
  const price = parseFloat(spotData?.data?.amount);
  if (!price) throw new Error(`No price for ${sym}`);

  // 24 h stats from Coinbase Exchange (not all coins listed there)
  let changePercent = null;
  let change = null;
  try {
    const statsUrl = `https://api.exchange.coinbase.com/products/${productId}/stats`;
    const stats = await coinbaseFetch(statsUrl);
    if (stats?.open && stats?.last) {
      const open = parseFloat(stats.open);
      const last = parseFloat(stats.last);
      change = last - open;
      changePercent = ((last - open) / open) * 100;
    }
  } catch {
    // Coin not on Coinbase Exchange — that's fine, we still have the spot price
  }

  return { symbol: sym, price, change, changePercent };
}

// GET /api/crypto/quote?symbol=BTC
router.get('/quote', async (req, res, next) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });
    const data = await fetchCryptoQuote(symbol);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/crypto/batch?symbols=BTC,ETH,SOL  (up to 10)
router.get('/batch', async (req, res, next) => {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.status(400).json({ error: 'symbols required' });
    const list = symbols.split(',').slice(0, 10).map((s) => s.trim().toUpperCase());

    const results = await Promise.allSettled(list.map(fetchCryptoQuote));
    const coins = results
      .map((r, i) =>
        r.status === 'fulfilled'
          ? r.value
          : { symbol: list[i], price: null, change: null, changePercent: null }
      );
    res.json({ coins });
  } catch (err) {
    next(err);
  }
});

// ── CoinGecko ID map ──────────────────────────────────────────────────────────
const CG_IDS = {
  // Major / top-cap
  BTC: 'bitcoin',             ETH: 'ethereum',           SOL: 'solana',
  BNB: 'binancecoin',         XRP: 'ripple',             ADA: 'cardano',
  AVAX: 'avalanche-2',        LINK: 'chainlink',         DOT: 'polkadot',
  MATIC: 'matic-network',     TON: 'the-open-network',   TRX: 'tron',
  // Layer-2 / alt-L1 / DeFi
  ARB: 'arbitrum',            OP: 'optimism',            ATOM: 'cosmos',
  UNI: 'uniswap',             NEAR: 'near',              LTC: 'litecoin',
  BCH: 'bitcoin-cash',        ALGO: 'algorand',          SUI: 'sui',
  FTM: 'fantom',              HBAR: 'hedera-hashgraph',  ICP: 'internet-computer',
  FIL: 'filecoin',            AAVE: 'aave',              MKR: 'maker',
  RUNE: 'thorchain',          THETA: 'theta-token',      CHZ: 'chiliz',
  // Meme coins — established
  DOGE: 'dogecoin',           SHIB: 'shiba-inu',         PEPE: 'pepe',
  WIF: 'dogwifhat',           BONK: 'bonk',              FLOKI: 'floki',
  POPCAT: 'popcat',           BRETT: 'brett',            TURBO: 'turbo',
  MEW: 'cat-in-a-dogs-world', BOME: 'book-of-meme',      MOODENG: 'moo-deng',
  NEIRO: 'neiro-ethereum',    TRUMP: 'official-trump',   FARTCOIN: 'fartcoin',
  MOG: 'mog-coin',            GIGA: 'gigachad-2',        PONKE: 'ponke',
};

// Longer cache for chart data (2 minutes) and search results (5 minutes)
const CHART_TTL  = 120_000;
const SEARCH_TTL = 300_000;

/** Resolve a symbol to a CoinGecko coin ID — checks CG_IDS first, then hits the search API. */
async function resolveCgId(sym) {
  const upper = sym.toUpperCase();
  if (CG_IDS[upper]) return CG_IDS[upper];

  const cacheKey = `cg_search:${upper}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < SEARCH_TTL) return hit.data;

  try {
    const searchRes = await fetch(
      `https://api.coingecko.com/api/v3/search?q=${encodeURIComponent(sym)}`,
      { headers: { 'User-Agent': 'CarlBot/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(8_000) }
    );
    if (!searchRes.ok) return null;
    const json = await searchRes.json();
    const match = (json?.coins || []).find((c) => c.symbol.toUpperCase() === upper);
    const id = match?.id || null;
    cache.set(cacheKey, { data: id, ts: Date.now() });
    return id;
  } catch {
    return null;
  }
}

// GET /api/crypto/chart?symbol=BTC&days=30
router.get('/chart', async (req, res, next) => {
  try {
    const { symbol, days = '30' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });

    const id = await resolveCgId(symbol);
    if (!id) return res.status(404).json({ error: `No chart data for ${symbol}` });

    const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;

    // Use a longer-TTL cache entry for charts
    const hit = cache.get(url);
    if (hit && Date.now() - hit.ts < CHART_TTL) {
      return res.json(hit.data);
    }

    const cgRes = await fetch(url, {
      headers: { 'User-Agent': 'CarlBot/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!cgRes.ok) {
      // CoinGecko rate-limit or error
      return res.status(cgRes.status).json({ error: `CoinGecko ${cgRes.status}` });
    }

    const raw = await cgRes.json();
    const prices  = raw.prices  || [];
    const volumes = raw.total_volumes || [];

    const points = prices.map(([ts, price], i) => ({
      date:   new Date(ts).toISOString(),
      close:  price,
      volume: volumes[i]?.[1] ?? null,
    }));

    const payload = { symbol: symbol.toUpperCase(), days, points };
    cache.set(url, { data: payload, ts: Date.now() });
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /api/crypto/cgids — expose the symbol→id map so the client can check availability
router.get('/cgids', (_req, res) => {
  res.json(CG_IDS);
});

export default router;
