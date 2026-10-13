/**
 * app.js — Express application setup.
 * 
 * Separated from server.js so the Express app can be imported independently
 * for testing without starting the HTTP server.
 */
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS: allow the Vite dev server (port 5173) to call the API
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Parse JSON bodies (used by all API endpoints)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies (used by form submissions)
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// All API routes are prefixed with /api
// The frontend Axios client is configured to use http://localhost:5000/api
app.use('/api', routes);

// ---------------------------------------------------------------------------
// Health check (useful for verifying the server is up)
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : err.message?.startsWith('Invalid file type') ? 400 : 500);
  console.error('[RIP] Unhandled request error:', { method: req.method, path: req.path, status, message: err.message });
  res.status(status).json({
    message: err.message || 'Internal server error',
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
