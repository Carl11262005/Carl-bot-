/**
 * Firebase Functions entry point.
 * All /api/* requests are handled here; static assets are served by Firebase Hosting.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { app } from './src/index.js';

const anthropicKey = defineSecret('ANTHROPIC_API_KEY');

export const api = onRequest(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 60, secrets: [anthropicKey] },
  app
);
