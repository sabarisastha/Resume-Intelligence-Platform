/**
 * Auth controller — HTTP layer for authentication endpoints.
 * 
 * Each handler maps an HTTP request to a service call and formats the response.
 * Business logic lives in authService.js, not here — this file should only
 * deal with req/res concerns (parsing body, setting status codes, sending JSON).
 */
import * as authService from '../services/authService.js';

/**
 * POST /api/auth/register
 * Body: { email, password, full_name, phone?, linkedin_url?, github_url?, portfolio_url? }
 */
export async function register(req, res, next) {
  try {
    const { email, password, full_name } = req.body;

    // Validate required fields at the HTTP layer
    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Email, password, and full name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    // If the service threw with a status code, use it; otherwise 500
    res.status(error.status || 500).json({ message: error.message });
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

/**
 * GET /api/auth/profile
 * Headers: Authorization: Bearer <token>
 * 
 * Returns the current user's profile. Used by the frontend's AuthContext
 * to validate the stored token on page load.
 */
export async function getProfile(req, res, next) {
  try {
    // req.user is set by the authenticate middleware
    const user = await authService.getUserProfile(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}
