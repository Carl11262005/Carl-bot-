import { Router } from 'express';

const router = Router();

let yahooFinance;
async function getYF() {
  if (!yahooFinance) {
    const YahooFinance = (await import('yahoo-finance2')).default;
    yahooFinance = new YahooFinance();
  }
  return yahooFinance;
}

router.get('/quote', async (req, res, next) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const yf = await getYF();
    const quote = await yf.quote(symbol.toUpperCase());

    res.json({
      symbol: quote.symbol,
      name: quote.shortName || quote.longName || quote.symbol,
      fullName: quote.longName || quote.shortName || quote.symbol,
      quoteType: quote.quoteType,
      price: quote.regularMarketPrice,
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
      // Valuation
      trailingPE: quote.trailingPE,
      forwardPE: quote.forwardPE,
      priceToBook: quote.priceToBook,
      // Per-share
      epsTrailing: quote.epsTrailingTwelveMonths,
      epsForward: quote.epsForward,
      bookValue: quote.bookValue,
      // Dividends
      dividendRate: quote.trailingAnnualDividendRate,
      dividendYield: quote.trailingAnnualDividendYield,
      // Risk / Performance
      beta: quote.beta,
      fiftyDayAvg: quote.fiftyDayAverage,
      twoHundredDayAvg: quote.twoHundredDayAverage,
      fiftyDayChange: quote.fiftyDayAverageChangePercent,
      twoHundredDayChange: quote.twoHundredDayAverageChangePercent,
      // Shares
      sharesOutstanding: quote.sharesOutstanding,
      floatShares: quote.floatShares,
      // Financials
      revenue: quote.revenuePerShare,
      // Earnings date
      earningsTimestamp: quote.earningsTimestamp,
      // Exchange info
      exchange: quote.fullExchangeName || quote.exchange,
      currency: quote.currency,
      marketState: quote.marketState,
      // Post/pre market
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
    if (!q) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const yf = await getYF();
    const results = await yf.search(q);

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
  '1d': { interval: '5m', subtract: 1 },
  '1w': { interval: '15m', subtract: 7 },
  '1m': { interval: '1d', subtract: 30 },
  '3m': { interval: '1d', subtract: 90 },
  '1y': { interval: '1wk', subtract: 365 },
  max: { interval: '1mo', subtract: 365 * 20 },
};

router.get('/chart', async (req, res, next) => {
  try {
    const { symbol, range = '1m' } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const config = RANGE_CONFIG[range] || RANGE_CONFIG['1m'];
    const now = new Date();
    const period1 = new Date(now);
    period1.setDate(period1.getDate() - config.subtract);

    const yf = await getYF();
    const result = await yf.chart(symbol.toUpperCase(), {
      period1: period1.toISOString().split('T')[0],
      period2: now.toISOString().split('T')[0],
      interval: config.interval,
    });

    const points = (result.quotes || [])
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
