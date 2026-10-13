import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as atsController from '../controllers/atsController.js';

const router = Router();

// /api/resumes/:resumeId/analyze
router.post('/:resumeId/analyze', authenticate, atsController.analyzeResume);

export default router;
