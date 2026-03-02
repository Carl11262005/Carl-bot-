/**
 * Firebase Functions entry point.
 * All /api/* requests are handled here; static assets are served by Firebase Hosting.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { app } from './src/index.js';

export const api = onRequest({ region: 'us-central1', memory: '512MiB', timeoutSeconds: 60 }, app);
