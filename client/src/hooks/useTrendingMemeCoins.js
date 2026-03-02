import { useState, useEffect } from 'react';
import { getTrendingMemeCoins, getDiscoveredMemeCoins } from '../services/cryptoService.js';

const LS_KEY = 'carlbot_discovered_meme_coins';

function loadLocalCoins() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCoins(coins) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(coins));
  } catch {}
}

function mergeCoins(existing, incoming) {
  const map = new Map(existing.map((c) => [c.address, c]));
  for (const c of incoming) {
    if (!map.has(c.address)) {
      map.set(c.address, { ...c, discoveredAt: c.discoveredAt || new Date().toISOString() });
    } else {
      map.set(c.address, { ...map.get(c.address), price: c.price, changePercent: c.changePercent });
    }
  }
  return Array.from(map.values());
}

/**
 * Returns trending meme coins from DexScreener/Moonshot.
 * New coins are automatically persisted in localStorage AND on the server.
 */
export function useTrendingMemeCoins() {
  const [coins, setCoins] = useState(loadLocalCoins);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        // Load previously discovered coins from server first
        const discovered = await getDiscoveredMemeCoins();
        if (!cancelled && discovered.length > 0) {
          setCoins((prev) => {
            const merged = mergeCoins(prev, discovered);
            saveLocalCoins(merged);
            return merged;
          });
        }

        // Then fetch latest trending
        const trending = await getTrendingMemeCoins();
        if (!cancelled && trending.length > 0) {
          setCoins((prev) => {
            const merged = mergeCoins(prev, trending);
            saveLocalCoins(merged);
            return merged;
          });
        }
      } catch {
        // Silently keep whatever we have
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refresh();
    // Re-check every 5 minutes for new coins
    const interval = setInterval(refresh, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { coins, loading };
}
