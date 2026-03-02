import { useState, useEffect, useRef } from 'react';
import { getQuote } from '../services/stockService.js';

export function useStockQuote(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

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

    fetchQuote();
    intervalRef.current = setInterval(fetchQuote, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [symbol]);

  return { data, loading, error };
}
