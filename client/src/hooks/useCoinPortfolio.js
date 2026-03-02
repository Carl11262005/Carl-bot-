import { useState } from 'react';

const LS_KEY = 'carlbot_coin_holdings';

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

/**
 * Persistent portfolio for crypto and meme coin holdings.
 * Each holding: { id, symbol, name, color, type ('crypto'|'meme'), amount, buyPrice, address?, chainId? }
 */
export function useCoinPortfolio() {
  const [holdings, setHoldings] = useState(load);

  function save(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    setHoldings(list);
  }

  function addHolding(coin) {
    save([...holdings, { ...coin, id: Date.now() }]);
  }

  function removeHolding(id) {
    save(holdings.filter((h) => h.id !== id));
  }

  const cryptoHoldings = holdings.filter((h) => h.type === 'crypto');
  const memeHoldings   = holdings.filter((h) => h.type === 'meme');

  return { holdings, cryptoHoldings, memeHoldings, addHolding, removeHolding };
}
