/**
 * /api/meme — Live meme-coin data from DexScreener (which powers Moonshot)
 *
 * GET /api/meme/quote?symbol=DOGE
 *   → best DEX pair for the given symbol (highest liquidity)
 *
 * GET /api/meme/trending
 *   → top trending Solana meme coins from DexScreener / Moonshot
 *   → also auto-saves newly discovered coins to server/data/discovered_meme_coins.json
 *
 * GET /api/meme/discovered
 *   → returns the persisted list of coins found via trending
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
// Firebase Functions filesystem is read-only except /tmp
const IS_FIREBASE = !!(process.env.K_SERVICE || process.env.FUNCTION_NAME || process.env.FUNCTIONS_EMULATOR);
const DB_PATH = IS_FIREBASE
  ? '/tmp/discovered_meme_coins.json'
  : join(__dir, '../../data/discovered_meme_coins.json');

const router = Router();
const DEX_BASE = 'https://api.dexscreener.com';

// In-process response cache
const cache = new Map();
const TTL = 30_000;

async function dexFetch(path) {
  const url = `${DEX_BASE}${path}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'CarlBot/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`DexScreener ${res.status}: ${path}`);
  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

// ── Persistent store helpers ─────────────────────────────────────────────────
function loadDiscovered() {
  try {
    if (!existsSync(DB_PATH)) return [];
    return JSON.parse(readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveDiscovered(coins) {
  try {
    writeFileSync(DB_PATH, JSON.stringify(coins, null, 2));
  } catch (err) {
    console.error('Failed to save discovered coins:', err.message);
  }
}

/** Merge newly discovered coins into the persisted list (no duplicates by address). */
function mergeDiscovered(existing, incoming) {
  const map = new Map(existing.map((c) => [c.address, c]));
  for (const coin of incoming) {
    if (!map.has(coin.address)) {
      map.set(coin.address, coin);
    } else {
      // Update price/change but keep original discovery time
      const old = map.get(coin.address);
      map.set(coin.address, { ...old, price: coin.price, changePercent: coin.changePercent });
    }
  }
  return Array.from(map.values());
}

// ── Route: single coin by symbol ─────────────────────────────────────────────
router.get('/quote', async (req, res, next) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'symbol required' });

    const data = await dexFetch(`/latest/dex/search?q=${encodeURIComponent(symbol)}`);
    const pairs = (data?.pairs || [])
      .filter(
        (p) =>
          p.baseToken.symbol.toUpperCase() === symbol.toUpperCase() &&
          p.priceUsd
      )
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    if (!pairs.length) return res.status(404).json({ error: 'Coin not found' });

    const p = pairs[0];
    res.json({
      symbol: p.baseToken.symbol,
      name: p.baseToken.name,
      address: p.baseToken.address,
      chainId: p.chainId,
      price: parseFloat(p.priceUsd),
      changePercent: p.priceChange?.h24 ?? null,
      volume24h: p.volume?.h24 ?? 0,
      marketCap: p.marketCap ?? null,
      liquidity: p.liquidity?.usd ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

// ── Route: trending / Moonshot coins ─────────────────────────────────────────
router.get('/trending', async (req, res, next) => {
  try {
    // Boosted tokens on DexScreener (this is the Moonshot featured feed)
    const boosts = await dexFetch('/token-boosts/latest/v1');
    const solana = (Array.isArray(boosts) ? boosts : [])
      .filter((b) => b.chainId === 'solana')
      .slice(0, 30);

    let trendingCoins = [];

    if (solana.length > 0) {
      const addresses = solana.map((b) => b.tokenAddress).join(',');
      const tokenData = await dexFetch(`/latest/dex/tokens/${addresses}`);

      // Keep only the highest-volume pair per token
      const best = new Map();
      for (const pair of tokenData?.pairs || []) {
        if (!pair.priceUsd) continue;
        const addr = pair.baseToken.address;
        const cur = best.get(addr);
        if (!cur || (pair.volume?.h24 ?? 0) > (cur.volume?.h24 ?? 0)) {
          best.set(addr, pair);
        }
      }

      trendingCoins = Array.from(best.values()).map((p) => ({
        address: p.baseToken.address,
        symbol: p.baseToken.symbol,
        name: p.baseToken.name,
        chainId: p.chainId,
        price: parseFloat(p.priceUsd),
        changePercent: p.priceChange?.h24 ?? null,
        volume24h: p.volume?.h24 ?? 0,
        marketCap: p.marketCap ?? null,
        liquidity: p.liquidity?.usd ?? 0,
        discoveredAt: new Date().toISOString(),
      }));
    }

    // Persist any newly discovered coins
    if (trendingCoins.length > 0) {
      const existing = loadDiscovered();
      const merged = mergeDiscovered(existing, trendingCoins);
      saveDiscovered(merged);
    }

    res.json({ coins: trendingCoins });
  } catch (err) {
    next(err);
  }
});

// ── Route: get all discovered coins ──────────────────────────────────────────
router.get('/discovered', async (req, res) => {
  res.json({ coins: loadDiscovered() });
});

// ── Route: OHLCV chart for a meme coin by token address ──────────────────────
// GET /api/meme/chart?address={solana_addr}&chainId=solana&days=7
const CHART_TTL = 120_000;
const DEX_CHART_BASE = 'https://io.dexscreener.com';

router.get('/chart', async (req, res, next) => {
  try {
    const { address, chainId = 'solana', days = '7' } = req.query;
    if (!address) return res.status(400).json({ error: 'address required' });

    // Step 1: get the best pair address for this token
    const tokenData = await dexFetch(`/latest/dex/tokens/${address}`);
    const pairs = (tokenData?.pairs || [])
      .filter((p) => p.priceUsd)
      .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));

    if (!pairs.length) return res.status(404).json({ error: 'No pairs found for token' });

    const pairAddress = pairs[0].pairAddress;
    const pairChain   = pairs[0].chainId || chainId;

    // Step 2: fetch OHLCV candles from DexScreener chart API
    const now  = Math.floor(Date.now() / 1000);
    const from = now - parseInt(days, 10) * 86_400;
    const chartUrl = `${DEX_CHART_BASE}/dex/chart/amm/v3/${pairChain}/${pairAddress}?from=${from}&to=${now}&resolution=1D`;

    const chartCacheHit = cache.get(chartUrl);
    if (chartCacheHit && Date.now() - chartCacheHit.ts < CHART_TTL) {
      return res.json(chartCacheHit.data);
    }

    const chartRes = await fetch(chartUrl, {
      headers: { 'User-Agent': 'CarlBot/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!chartRes.ok) return res.status(chartRes.status).json({ error: 'Chart data unavailable' });

    const raw = await chartRes.json();

    // DexScreener returns TradingView format: { t: [ts], c: [close], v: [vol] }
    // or OHLCV arrays: { ohlcvs: [[ts, o, h, l, c, v], ...] }
    let points = [];
    if (Array.isArray(raw?.ohlcvs)) {
      points = raw.ohlcvs.map(([ts, , , , close, volume]) => ({
        date:   new Date(ts * 1000).toISOString(),
        close,
        volume: volume ?? null,
      }));
    } else if (Array.isArray(raw?.t)) {
      points = raw.t.map((ts, i) => ({
        date:   new Date(ts * 1000).toISOString(),
        close:  raw.c?.[i] ?? null,
        volume: raw.v?.[i] ?? null,
      })).filter((p) => p.close != null);
    }

    if (!points.length) return res.status(404).json({ error: 'No candle data returned' });

    const payload = { address, days, points };
    cache.set(chartUrl, { data: payload, ts: Date.now() });
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
