/**
 * JWT authentication middleware.
 * 
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and attaches the decoded user payload to req.user.
 * 
 * Used on all protected routes — any route that needs to know which user
 * is making the request should have this middleware in its chain.
 */
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify throws if the token is expired, malformed, or has a bad signature
    const decoded = jwt.verify(token, config.jwt.secret);
    // Attach the decoded payload (contains user id, email) to the request
    // so downstream handlers can access req.user.id, req.user.email, etc.
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
