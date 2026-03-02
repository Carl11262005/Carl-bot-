import { useState, useCallback } from 'react';

const STORAGE_KEY = 'carlbot_portfolio';

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePortfolio(portfolio) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState(loadPortfolio);

  const addStock = useCallback((entry) => {
    setPortfolio((prev) => {
      const exists = prev.find((s) => s.symbol === entry.symbol);
      let next;
      if (exists) {
        next = prev.map((s) =>
          s.symbol === entry.symbol ? { ...s, ...entry } : s
        );
      } else {
        next = [...prev, { ...entry, addedAt: new Date().toISOString() }];
      }
      savePortfolio(next);
      return next;
    });
  }, []);

  const removeStock = useCallback((symbol) => {
    setPortfolio((prev) => {
      const next = prev.filter((s) => s.symbol !== symbol);
      savePortfolio(next);
      return next;
    });
  }, []);

  const clearPortfolio = useCallback(() => {
    setPortfolio([]);
    savePortfolio([]);
  }, []);

  return { portfolio, addStock, removeStock, clearPortfolio };
}
