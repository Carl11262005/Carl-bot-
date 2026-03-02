import { useState, useEffect, useRef } from 'react';
import { getQuote } from '../services/stockService.js';

/**
 * @param {string} symbol
 * @param {{ refreshMs?: number, delayMs?: number }} options
 *   refreshMs – polling interval in ms (default 30 000)
 *   delayMs   – delay before the very first fetch, useful for staggering many calls (default 0)
 */
export function useStockQuote(symbol, { refreshMs = 30_000, delayMs = 0 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const delayRef = useRef(null);

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    async function fetchQuote() {
      try {
        setLoading(true);
        const quote = await getQuote(symbol);
        if (!cancelled) {
          setData(quote);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Stagger the initial fetch, then poll at the given interval
    delayRef.current = setTimeout(() => {
      if (!cancelled) {
        fetchQuote();
        intervalRef.current = setInterval(fetchQuote, refreshMs);
      }
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(delayRef.current);
      clearInterval(intervalRef.current);
    };
  }, [symbol, refreshMs, delayMs]);

  return { data, loading, error };
}
