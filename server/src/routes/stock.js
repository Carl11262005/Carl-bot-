import { Router } from 'express';

const router = Router();

let yahooFinance;
async function getYF() {
  if (!yahooFinance) {
    const mod = await import('yahoo-finance2');
    // v3 exports the class as default; grab the instance correctly
    const YF = mod.default?.default ?? mod.default;
    yahooFinance = typeof YF === 'function' ? new YF() : YF;
  }
  return yahooFinance;
}

// Suppress validation warnings (yahoo-finance2 can throw ValidationError on partial data)
const SUPPRESS = { validateResult: false };

// Pre-warm Yahoo Finance (including cookie fetch) so the first user request is fast
getYF()
  .then((yf) => yf.quote('AAPL', {}, { validateResult: false }))
  .then(() => console.log('[stock] Yahoo Finance ready'))
  .catch((err) => console.warn('[stock] Yahoo Finance warmup failed:', err?.message));

router.get('/quote', async (req, res, next) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

    const yf = await getYF();

    let quote;
    try {
      quote = await yf.quote(symbol.toUpperCase(), {}, SUPPRESS);
    } catch (err) {
      // ValidationError still contains `.result` with usable data
      if (err.result) {
        quote = err.result;
      } else {
        throw err;
      }
    }

    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    const price =
      quote.regularMarketPrice ??
      quote.postMarketPrice ??
      quote.preMarketPrice ??
      null;

    res.json({
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || quote.symbol,
      fullName: quote.longName || quote.shortName || quote.symbol,
      quoteType: quote.quoteType,
      price,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      avgVolume: quote.averageDailyVolume3Month,
      marketCap: quote.marketCap,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      trailingPE: quote.trailingPE,
      forwardPE: quote.forwardPE,
      priceToBook: quote.priceToBook,
      epsTrailing: quote.epsTrailingTwelveMonths,
      epsForward: quote.epsForward,
      bookValue: quote.bookValue,
      dividendRate: quote.trailingAnnualDividendRate,
      dividendYield: quote.trailingAnnualDividendYield,
      beta: quote.beta,
      fiftyDayAvg: quote.fiftyDayAverage,
      twoHundredDayAvg: quote.twoHundredDayAverage,
      fiftyDayChange: quote.fiftyDayAverageChangePercent,
      twoHundredDayChange: quote.twoHundredDayAverageChangePercent,
      sharesOutstanding: quote.sharesOutstanding,
      floatShares: quote.floatShares,
      earningsTimestamp: quote.earningsTimestamp,
      exchange: quote.fullExchangeName || quote.exchange,
      currency: quote.currency,
      marketState: quote.marketState,
      preMarketPrice: quote.preMarketPrice,
      preMarketChange: quote.preMarketChange,
      postMarketPrice: quote.postMarketPrice,
      postMarketChange: quote.postMarketChange,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query is required' });

    const yf = await getYF();
    const results = await yf.search(q, {}, SUPPRESS);

    const quotes = (results.quotes || [])
      .filter((r) => r.isYahooFinance && ['EQUITY', 'ETF', 'MUTUALFUND', 'INDEX'].includes(r.quoteType))
      .slice(0, 8)
      .map((r) => ({
        symbol: r.symbol,
        name: r.shortname || r.longname || r.symbol,
        exchange: r.exchDisp || r.exchange,
      }));

    res.json({ results: quotes });
  } catch (err) {
    next(err);
  }
});

const RANGE_CONFIG = {
  '1d':  { interval: '5m',  subtract: 1 },
  '1w':  { interval: '15m', subtract: 7 },
  '1m':  { interval: '1d',  subtract: 30 },
  '3m':  { interval: '1d',  subtract: 90 },
  '1y':  { interval: '1wk', subtract: 365 },
  'max': { interval: '1mo', subtract: 365 * 20 },
};

router.get('/chart', async (req, res, next) => {
  try {
    const { symbol, range = '1m' } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

    const config = RANGE_CONFIG[range] || RANGE_CONFIG['1m'];
    const now = new Date();
    const period1 = new Date(now);
    period1.setDate(period1.getDate() - config.subtract);

    const yf = await getYF();

    let result;
    try {
      result = await yf.chart(symbol.toUpperCase(), {
        period1: period1.toISOString().split('T')[0],
        period2: now.toISOString().split('T')[0],
        interval: config.interval,
      }, SUPPRESS);
    } catch (err) {
      if (err.result) {
        result = err.result;
      } else {
        throw err;
      }
    }

    const points = (result?.quotes || [])
      .filter((q) => q.close != null)
      .map((q) => ({
        date: q.date,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      }));

    res.json({ symbol: symbol.toUpperCase(), range, points });
  } catch (err) {
    next(err);
  }
});

export default router;
