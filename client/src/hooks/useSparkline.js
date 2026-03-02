import { useState, useEffect } from 'react';
import { getChart } from '../services/stockService.js';

export function useSparkline(symbol) {
  const [points, setPoints] = useState(null);
  const [periodChange, setPeriodChange] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    async function fetch() {
      try {
        setLoading(true);
        const data = await getChart(symbol, '1m');
        if (cancelled || !data.points || data.points.length < 2) return;

        setPoints(data.points);

        // Calculate change over the 1-month period
        const first = data.points[0].close;
        const last = data.points[data.points.length - 1].close;
        const dollarChange = last - first;
        const pctChange = ((last - first) / first) * 100;

        setPeriodChange({
          dollars: dollarChange,
          percent: pctChange,
          startPrice: first,
          endPrice: last,
        });
      } catch {
        // silently fail - sparkline is optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    // Refresh sparkline every 5 minutes
    const interval = setInterval(fetch, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol]);

  return { points, periodChange, loading };
}
