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

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Build the Express app (used locally AND by Firebase Functions) ────────────
export const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use('/api/chat',   chatLimiter,   chatRouter);
app.use('/api/stock',  stockLimiter,  stockRouter);
app.use('/api/crypto', cryptoLimiter, cryptoRouter);
app.use('/api/meme',   memeLimiter,   memeRouter);

// Serve React build only when running locally (Firebase Hosting handles this in production)
const IS_FIREBASE = !!(process.env.K_SERVICE || process.env.FUNCTION_NAME || process.env.FUNCTIONS_EMULATOR);
if (!IS_FIREBASE) {
  const clientDist = join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

app.use(errorHandler);

// ── Start local server when NOT running inside Firebase Functions ─────────────
if (!IS_FIREBASE) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`CarlBot server running on port ${PORT}`));
}
