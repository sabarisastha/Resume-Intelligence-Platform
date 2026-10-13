/**
 * Skills service — manages the skills master table and the resume_skills junction.
 * 
 * Two separate concerns:
 * 1. The `skills` table is a master list of standardized skill names (strong entity).
 *    When a user adds "ReactJS", we check if "ReactJS" already exists; if so,
 *    we reuse it rather than creating a duplicate.
 * 2. The `resume_skills` junction table links a resume to skills with a proficiency level.
 */
import { pool } from '../config/db.js';

/**
 * Find or create a skill in the master table.
 * This ensures skill names are standardized — "React" and "ReactJS" are different entries,
 * but the same user adding "React" twice won't create duplicates.
 */
async function findOrCreateSkill(name, category) {
  // Try to find existing
  let result = await pool.query(
    'SELECT * FROM skills WHERE LOWER(name) = LOWER($1)',
    [name]
  );
  if (result.rows.length > 0) return result.rows[0];

  // Create new
  result = await pool.query(
    'INSERT INTO skills (name, category) VALUES ($1, $2) RETURNING *',
    [name, category || null]
  );
  return result.rows[0];
}

/**
 * Add a skill to a resume (creates the junction table entry).
 */
export async function addSkillToResume(resumeId, data) {
  const { name, category, proficiency } = data;

  // Step 1: Find or create the skill in the master table
  const skill = await findOrCreateSkill(name, category);

  // Step 2: Create the junction entry
  // ON CONFLICT handles the case where this skill is already on this resume
  const result = await pool.query(
    `INSERT INTO resume_skills (resume_id, skill_id, proficiency)
     VALUES ($1, $2, $3)
     ON CONFLICT (resume_id, skill_id) DO UPDATE SET proficiency = $3
     RETURNING *`,
    [resumeId, skill.id, proficiency || null]
  );

  return { ...result.rows[0], skill_name: skill.name, skill_category: skill.category };
}

/**
 * Get all skills for a resume (with skill details from the master table).
 */
export async function getSkillsByResume(resumeId) {
  const result = await pool.query(
    `SELECT s.id as skill_id, s.name, s.category, rs.proficiency
     FROM resume_skills rs
     JOIN skills s ON rs.skill_id = s.id
     WHERE rs.resume_id = $1
     ORDER BY s.category, s.name`,
    [resumeId]
  );
  return result.rows;
}

/**
 * Remove a skill from a resume.
 */
export async function removeSkillFromResume(resumeId, skillId) {
  const result = await pool.query(
    'DELETE FROM resume_skills WHERE resume_id = $1 AND skill_id = $2 RETURNING *',
    [resumeId, skillId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Skill not linked to this resume');
    error.status = 404;
    throw error;
  }
  return { deleted: true };
}

/**
 * Bulk-set skills for a resume (replace all existing skills).
 * Used when the resume builder saves all skills at once.
 * @param {string} resumeId
 * @param {Array<{name, category?, proficiency?}>} skills
 */
export async function setSkillsForResume(resumeId, skills) {
  // Delete all existing skill links for this resume
  await pool.query('DELETE FROM resume_skills WHERE resume_id = $1', [resumeId]);

  // Add each skill
  const results = [];
  for (const skill of skills) {
    const added = await addSkillToResume(resumeId, typeof skill === 'string' ? { name: skill } : skill);
    results.push(added);
  }

  return results;
}
