/**
 * server.js — Entry point for the RIP backend.
 * 
 * Responsibilities:
 * 1. Load environment variables (must happen before anything else imports config)
 * 2. Connect to core data stores (Postgres, MongoDB); Qdrant is optional
 * 3. Start the Express HTTP server
 * 
 * We connect to databases BEFORE starting the server so the app doesn't
 * accept requests it can't fulfill. If any database is unreachable,
 * the process exits with an error rather than starting in a broken state.
 */
import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectPostgres } from './src/config/db.js';
import { connectMongo } from './src/config/mongodb.js';
import { connectQdrant } from './src/config/qdrant.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await Promise.all([connectPostgres(), connectMongo()]);
    try {
      await connectQdrant();
    } catch (error) {
      console.warn('[RIP] Qdrant unavailable; resume CRUD remains available. Semantic matching is disabled:', error.message);
    }

    const server = app.listen(PORT, () => {
      console.log(`\n[RIP] Server running on http://localhost:${PORT}`);
      console.log(`[RIP] API base: http://localhost:${PORT}/api\n`);
    });
    
    // AI requests have their own bounded timeout; do not leave API calls open for minutes.
    server.timeout = 130000;
  } catch (error) {
    console.error('[RIP] Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
