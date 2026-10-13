/**
 * Auth routes — /api/auth/*
 * 
 * POST /api/auth/register  — Create a new account
 * POST /api/auth/login     — Authenticate and get a token
 * GET  /api/auth/profile   — Get the current user's profile (requires token)
 */
import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
// Profile requires authentication — the middleware verifies the JWT
// and attaches the decoded payload to req.user before the handler runs
router.get('/profile', authenticate, authController.getProfile);

export default router;
