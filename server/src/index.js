import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chatRouter from './routes/chat.js';
import stockRouter from './routes/stock.js';
import { errorHandler } from './middleware/errorHandler.js';
import { chatLimiter, stockLimiter } from './middleware/rateLimiter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/chat', chatLimiter, chatRouter);
app.use('/api/stock', stockLimiter, stockRouter);

// Serve static files in production
const clientDist = join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(join(clientDist, 'index.html'));
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CarlBot server running on port ${PORT}`);
});
