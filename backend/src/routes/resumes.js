/**
 * Resume routes — /api/resumes/*
 * 
 * All routes require authentication.
 * Sub-entity routes are nested: /api/resumes/:resumeId/education, etc.
 * 
 * Route structure:
 * 
 * POST   /api/resumes                          — Create a resume
 * GET    /api/resumes                           — List user's resumes
 * GET    /api/resumes/:resumeId                 — Get a resume with full content
 * PUT    /api/resumes/:resumeId                 — Update resume metadata
 * DELETE /api/resumes/:resumeId                 — Delete a resume
 * 
 * POST   /api/resumes/:resumeId/education       — Add education entry
 * GET    /api/resumes/:resumeId/education       — List education entries
 * PUT    /api/resumes/:resumeId/education/:id   — Update education entry
 * DELETE /api/resumes/:resumeId/education/:id   — Delete education entry
 * 
 * (Same pattern for experience, projects, certifications)
 * 
 * POST   /api/resumes/:resumeId/skills          — Add a skill
 * GET    /api/resumes/:resumeId/skills           — List skills
 * PUT    /api/resumes/:resumeId/skills           — Bulk-set all skills
 * DELETE /api/resumes/:resumeId/skills/:skillId  — Remove a skill
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as rc from '../controllers/resumeController.js';

const router = Router();

// All resume routes require authentication
router.use(authenticate);

// ---- Resume CRUD ----
router.post('/', rc.createResume);
router.get('/', rc.getResumes);
router.get('/:resumeId', rc.getResumeById);
router.put('/:resumeId', rc.updateResume);
router.delete('/:resumeId', rc.deleteResume);

// ---- Education (nested under resume) ----
router.post('/:resumeId/education', rc.addEducation);
router.get('/:resumeId/education', rc.getEducation);
router.put('/:resumeId/education/:id', rc.updateEducation);
router.delete('/:resumeId/education/:id', rc.deleteEducation);

// ---- Experience ----
router.post('/:resumeId/experience', rc.addExperience);
router.get('/:resumeId/experience', rc.getExperience);
router.put('/:resumeId/experience/:id', rc.updateExperience);
router.delete('/:resumeId/experience/:id', rc.deleteExperience);

// ---- Projects ----
router.post('/:resumeId/projects', rc.addProject);
router.get('/:resumeId/projects', rc.getProjects);
router.put('/:resumeId/projects/:id', rc.updateProject);
router.delete('/:resumeId/projects/:id', rc.deleteProject);

// ---- Skills ----
router.post('/:resumeId/skills', rc.addSkill);
router.get('/:resumeId/skills', rc.getSkills);
router.put('/:resumeId/skills', rc.setSkills);
router.delete('/:resumeId/skills/:skillId', rc.removeSkill);

// ---- Certifications ----
router.post('/:resumeId/certifications', rc.addCertification);
router.get('/:resumeId/certifications', rc.getCertifications);
router.put('/:resumeId/certifications/:id', rc.updateCertification);
router.delete('/:resumeId/certifications/:id', rc.deleteCertification);

// ---- AI Features ----
import atsRoutes from './ats.js';
router.use('/', atsRoutes); // Mounts POST /:resumeId/analyze

import * as simulatorController from '../controllers/simulatorController.js';

// ---- Simulation ----
router.post('/:resumeId/simulate', authenticate, simulatorController.simulateMatch);

export default router;
