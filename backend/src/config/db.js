/**
 * PostgreSQL connection pool.
 * 
 * Uses the 'pg' library's Pool class, which maintains a pool of reusable
 * connections. This is more efficient than creating a new connection per query.
 * 
 * The pool is created once at import time but the actual TCP connection
 * isn't established until connectPostgres() is called or the first query runs.
 */
import pg from 'pg';
import config from './index.js';

const { Pool } = pg;

// PostgreSQL DATE values represent calendar dates, not instants. The default
// node-postgres parser converts them to local-midnight Date objects, which
// serialize to the previous day in UTC for UTC+ time zones. Keep them as
// YYYY-MM-DD strings so API clients and HTML date inputs see the stored date.
pg.types.setTypeParser(pg.types.builtins.DATE, value => value);

const pool = new Pool({
  host: config.pg.host,
  port: config.pg.port,
  user: config.pg.user,
  password: config.pg.password,
  database: config.pg.database,
  // Cap pool size — we're running locally, not under production load
  max: 10,
});

/**
 * Verify that Postgres is reachable by running a trivial query.
 * Called during server startup — if this fails, the server won't start.
 */
export async function connectPostgres() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('[Postgres] Connected —', result.rows[0].now);
  } catch (error) {
    console.error('[Postgres] Connection failed:', error.message);
    throw error;
  }
}

/**
 * Export the pool for use in services/controllers.
 * Usage: import { pool } from '../config/db.js';
 *        const { rows } = await pool.query('SELECT ...');
 */
export { pool };
