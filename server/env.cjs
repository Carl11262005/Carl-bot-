const path = require('path');
// Load .env.local first (local dev secrets), then .env as fallback
require('dotenv').config({ path: path.join(__dirname, '.env.local'), override: true });
require('dotenv').config({ path: path.join(__dirname, '.env') });
