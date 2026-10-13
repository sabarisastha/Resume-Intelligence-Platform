import { Router } from 'express';
import authRoutes from './auth.js';
import resumeRoutes from './resumes.js';
import uploadRoutes from './upload.js';
import enhancerRoutes from './enhancer.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/resumes', resumeRoutes);
router.use('/upload', uploadRoutes);
router.use('/projects', enhancerRoutes); // Legacy support for /projects/:id/enhance
router.use('/enhancer', enhancerRoutes);

export default router;
