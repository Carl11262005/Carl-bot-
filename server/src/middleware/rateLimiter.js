import rateLimit from 'express-rate-limit';

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many chat requests. Please wait a moment.' },
});

// Raised to 200 — ticker + cards + detail view all poll simultaneously
export const stockLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many stock requests. Please wait a moment.' },
});

export const cryptoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many crypto requests. Please wait a moment.' },
});

export const memeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many meme-coin requests. Please wait a moment.' },
});
