import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as enhancerController from '../controllers/enhancerController.js';

const router = Router();

// /api/enhancer/jd
router.post('/jd', authenticate, enhancerController.enhanceJobDescription);

// /api/enhancer/:projectId/enhance
router.post('/:projectId/enhance', authenticate, enhancerController.enhanceProjectDescription);

export default router;
