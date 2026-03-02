import api from './api.js';

/** Single Coinbase quote — { symbol, price, change, changePercent } */
export async function getCryptoQuote(symbol) {
  const { data } = await api.get(`/api/crypto/quote?symbol=${encodeURIComponent(symbol)}`);
  return data;
}

/** Batch Coinbase quotes */
export async function getCryptoBatch(symbols) {
  const { data } = await api.get(`/api/crypto/batch?symbols=${symbols.map(encodeURIComponent).join(',')}`);
  return data.coins;
}

/** CoinGecko historical chart — { symbol, days, points: [{date, close, volume}] } */
export async function getCryptoChart(symbol, days = '30') {
  const { data } = await api.get(`/api/crypto/chart?symbol=${encodeURIComponent(symbol)}&days=${days}`);
  return data;
}

/** DexScreener quote for a meme-coin by ticker symbol */
export async function getMemeQuote(symbol) {
  const { data } = await api.get(`/api/meme/quote?symbol=${encodeURIComponent(symbol)}`);
  return data;
}

/** Trending Solana meme coins (from DexScreener / Moonshot boosts) */
export async function getTrendingMemeCoins() {
  const { data } = await api.get('/api/meme/trending');
  return data.coins;
}

/** Coins previously discovered and persisted by the server */
export async function getDiscoveredMemeCoins() {
  const { data } = await api.get('/api/meme/discovered');
  return data.coins;
}

/** DexScreener OHLCV chart for a meme coin by contract address */
export async function getMemeChart(address, chainId = 'solana', days = '7') {
  const { data } = await api.get(
    `/api/meme/chart?address=${encodeURIComponent(address)}&chainId=${encodeURIComponent(chainId)}&days=${days}`
  );
  return data;
}
