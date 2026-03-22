import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chatRouter from './routes/chat.js';
import stockRouter from './routes/stock.js';
import cryptoRouter from './routes/crypto.js';
import memeRouter from './routes/meme.js';
import { errorHandler } from './middleware/errorHandler.js';
import { chatLimiter, stockLimiter, cryptoLimiter, memeLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Build the Express app (used locally AND by Firebase Functions) ────────────
export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use('/api/chat',   chatLimiter,   chatRouter);
app.use('/api/stock',  stockLimiter,  stockRouter);
app.use('/api/crypto', cryptoLimiter, cryptoRouter);
app.use('/api/meme',   memeLimiter,   memeRouter);

app.use(errorHandler);

// ── Start local server only when this file is the direct entry point ──────────
// Using process.argv[1] ensures we never accidentally call app.listen() when
// the module is loaded by Firebase Functions' deployment analyser or by functions.js.
const isEntryPoint = process.argv[1] === __filename;
if (isEntryPoint) {
  const clientDist = join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));

  const PORT = 5001;
  app.listen(PORT, () => console.log(`CarlBot server running on port ${PORT}`));
}
