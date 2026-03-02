import { useState, useEffect, useRef } from 'react';
import { getMemeQuote } from '../services/cryptoService.js';

/**
 * Fetches live DexScreener price for a meme-coin by ticker symbol.
 * @param {string} symbol  e.g. 'DOGE', 'PEPE', 'WIF'
 * @param {{ refreshMs?: number, delayMs?: number }} opts
 */
export function useMemeQuote(symbol, { refreshMs = 60_000, delayMs = 0 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        const result = await getMemeQuote(symbol);
        if (!cancelled) setData(result);
      } catch {
        // silently ignore — keep stale data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    timerRef.current = setTimeout(() => {
      if (!cancelled) {
        fetch();
        intervalRef.current = setInterval(fetch, refreshMs);
      }
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
      clearInterval(intervalRef.current);
    };
  }, [symbol, refreshMs, delayMs]);

  return { data, loading };
}
