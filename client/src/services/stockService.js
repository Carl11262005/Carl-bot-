import api from './api.js';

export async function getQuote(symbol) {
  const { data } = await api.get(`/api/stock/quote?symbol=${encodeURIComponent(symbol)}`);
  return data;
}

export async function searchSymbol(query) {
  const { data } = await api.get(`/api/stock/search?q=${encodeURIComponent(query)}`);
  return data.results;
}

export async function getChart(symbol, range = '1m') {
  const { data } = await api.get(
    `/api/stock/chart?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`
  );
  return data;
}
