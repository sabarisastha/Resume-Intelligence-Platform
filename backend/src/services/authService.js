/**
 * Auth service — business logic for registration and login.
 * 
 * Separated from the controller so the logic is testable without HTTP
 * request/response objects. The controller handles HTTP concerns (status
 * codes, response format); this service handles domain logic (hashing,
 * token generation, duplicate checking).
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import config from '../config/index.js';

// bcrypt salt rounds — 10 is a reasonable default for development.
// Higher = more secure but slower; 10 takes ~100ms which is fine.
const SALT_ROUNDS = 10;

/**
 * Register a new user.
 * 
 * @param {Object} userData - { email, password, full_name, phone?, linkedin_url?, github_url?, portfolio_url? }
 * @returns {{ user: Object, token: string }} The created user (without password_hash) and a JWT
 * @throws {Error} If email already exists (Postgres UNIQUE constraint)
 */
export async function registerUser(userData) {
  const { email, password, full_name, phone, linkedin_url, github_url, portfolio_url } = userData;

  // Check if email already exists before attempting insert,
  // so we can return a friendly error message instead of a raw DB constraint error
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    const error = new Error('Email already registered');
    error.status = 409; // Conflict
    throw error;
  }

  // Hash the password — never store plaintext passwords
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (email, password_hash, full_name, phone, linkedin_url, github_url, portfolio_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, full_name, phone, linkedin_url, github_url, portfolio_url, created_at`,
    [email, passwordHash, full_name, phone || null, linkedin_url || null, github_url || null, portfolio_url || null]
  );

  const user = result.rows[0];
  const token = generateToken(user);

  return { user, token };
}

/**
 * Authenticate a user with email and password.
 * 
 * @param {string} email
 * @param {string} password
 * @returns {{ user: Object, token: string }}
 * @throws {Error} If credentials are invalid
 */
export async function loginUser(email, password) {
  const result = await pool.query(
    'SELECT id, email, password_hash, full_name, phone, linkedin_url, github_url, portfolio_url FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const user = result.rows[0];

  // Compare the provided password against the stored bcrypt hash
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  // Remove password_hash from the user object before returning
  // — we never want to send this to the client
  const { password_hash, ...safeUser } = user;
  const token = generateToken(safeUser);

  return { user: safeUser, token };
}

/**
 * Get user profile by ID.
 * Used by the GET /auth/profile endpoint to validate tokens on page load.
 */
export async function getUserProfile(userId) {
  const result = await pool.query(
    'SELECT id, email, full_name, phone, linkedin_url, github_url, portfolio_url, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

/**
 * Generate a JWT containing the user's id and email.
 * 
 * The token payload is intentionally minimal — only what's needed to
 * identify the user. Full user data should be fetched from the DB
 * when needed, not stored in the token.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}
