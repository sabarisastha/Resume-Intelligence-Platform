import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import * as uc from '../controllers/uploadController.js';

const router = Router();

// Endpoint: POST /api/upload/resume
router.post('/resume', authenticate, upload.single('resume_file'), uc.uploadResume);

export default router;
