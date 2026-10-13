/**
 * Resume controller — handles HTTP requests for resume CRUD.
 * 
 * All endpoints require authentication. The user can only access their own resumes.
 * Sub-entity endpoints (education, experience, projects, skills, certifications)
 * are nested under /resumes/:resumeId/... to enforce the ownership chain.
 */
import * as resumeService from '../services/resumeService.js';
import * as educationService from '../services/educationService.js';
import * as experienceService from '../services/experienceService.js';
import * as projectService from '../services/projectService.js';
import * as skillService from '../services/skillService.js';
import * as certificationService from '../services/certificationService.js';
import { pool } from '../config/db.js';

// ---------------------------------------------------------------------------
// Helper: verify the resume belongs to the authenticated user
// Used by all sub-entity endpoints to enforce the ownership chain
// ---------------------------------------------------------------------------
async function verifyResumeOwnership(resumeId, userId) {
  const result = await pool.query(
    'SELECT id FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Resume not found or access denied');
    error.status = 404;
    throw error;
  }
}

// ========================== RESUME CRUD ==========================

export async function createResume(req, res) {
  try {
    const resume = await resumeService.createResume(req.user.id, req.body);
    res.status(201).json(resume);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getResumes(req, res) {
  try {
    const resumes = await resumeService.getResumesByUser(req.user.id);
    res.json(resumes);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getResumeById(req, res) {
  try {
    const resume = await resumeService.getResumeById(req.params.resumeId, req.user.id);
    res.json(resume);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function updateResume(req, res) {
  try {
    const resume = await resumeService.updateResume(req.params.resumeId, req.user.id, req.body);
    res.json(resume);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function deleteResume(req, res) {
  try {
    await resumeService.deleteResume(req.params.resumeId, req.user.id);
    res.json({ message: 'Resume deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

// ========================== EDUCATION CRUD ==========================

export async function addEducation(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await educationService.addEducation(req.params.resumeId, req.body);
    // Sync the full resume to MongoDB after adding a section
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.status(201).json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getEducation(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entries = await educationService.getEducationByResume(req.params.resumeId);
    res.json(entries);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function updateEducation(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await educationService.updateEducation(req.params.id, req.params.resumeId, req.body);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function deleteEducation(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    await educationService.deleteEducation(req.params.id, req.params.resumeId);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json({ message: 'Education entry deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

// ========================== EXPERIENCE CRUD ==========================

export async function addExperience(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await experienceService.addExperience(req.params.resumeId, req.body);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.status(201).json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getExperience(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entries = await experienceService.getExperienceByResume(req.params.resumeId);
    res.json(entries);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function updateExperience(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await experienceService.updateExperience(req.params.id, req.params.resumeId, req.body);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function deleteExperience(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    await experienceService.deleteExperience(req.params.id, req.params.resumeId);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json({ message: 'Experience entry deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

// ========================== PROJECT CRUD ==========================

export async function addProject(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await projectService.addProject(req.params.resumeId, req.body);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.status(201).json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getProjects(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entries = await projectService.getProjectsByResume(req.params.resumeId);
    res.json(entries);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function updateProject(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await projectService.updateProject(req.params.id, req.params.resumeId, req.body);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function deleteProject(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    await projectService.deleteProject(req.params.id, req.params.resumeId);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

// ========================== SKILLS CRUD ==========================

export async function addSkill(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await skillService.addSkillToResume(req.params.resumeId, req.body);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.status(201).json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getSkills(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entries = await skillService.getSkillsByResume(req.params.resumeId);
    res.json(entries);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function setSkills(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entries = await skillService.setSkillsForResume(req.params.resumeId, req.body.skills);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json(entries);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function removeSkill(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    await skillService.removeSkillFromResume(req.params.resumeId, req.params.skillId);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json({ message: 'Skill removed from resume' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

// ========================== CERTIFICATIONS CRUD ==========================

export async function addCertification(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await certificationService.addCertification(req.params.resumeId, req.body);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.status(201).json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function getCertifications(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entries = await certificationService.getCertificationsByResume(req.params.resumeId);
    res.json(entries);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function updateCertification(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    const entry = await certificationService.updateCertification(req.params.id, req.params.resumeId, req.body);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json(entry);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function deleteCertification(req, res) {
  try {
    await verifyResumeOwnership(req.params.resumeId, req.user.id);
    await certificationService.deleteCertification(req.params.id, req.params.resumeId);
    await resumeService.syncResumeToMongo(req.params.resumeId, req.user.id);
    res.json({ message: 'Certification deleted' });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
}
