/**
 * Experience CRUD service (weak entity — belongs to a resume).
 */
import { pool } from '../config/db.js';

export async function addExperience(resumeId, data) {
  const { company, role, start_date, end_date, is_current, description } = data;
  const result = await pool.query(
    `INSERT INTO experience (resume_id, company, role, start_date, end_date, is_current, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [resumeId, company, role || null, start_date || null, end_date || null, is_current || false, description || null]
  );
  return result.rows[0];
}

export async function getExperienceByResume(resumeId) {
  const result = await pool.query(
    'SELECT * FROM experience WHERE resume_id = $1 ORDER BY start_date DESC',
    [resumeId]
  );
  return result.rows;
}

export async function updateExperience(experienceId, resumeId, data) {
  const result = await pool.query(
    `UPDATE experience SET company = CASE WHEN $1 THEN $2 ELSE company END,
                           role = CASE WHEN $3 THEN $4 ELSE role END,
                           start_date = CASE WHEN $5 THEN $6 ELSE start_date END,
                           end_date = CASE WHEN $7 THEN $8 ELSE end_date END,
                           is_current = CASE WHEN $9 THEN $10 ELSE is_current END,
                           description = CASE WHEN $11 THEN $12 ELSE description END
     WHERE id = $13 AND resume_id = $14 RETURNING *`,
    [Object.hasOwn(data, 'company'), data.company ?? null, Object.hasOwn(data, 'role'), data.role ?? null,
      Object.hasOwn(data, 'start_date'), data.start_date || null, Object.hasOwn(data, 'end_date'), data.end_date || null,
      Object.hasOwn(data, 'is_current'), data.is_current ?? null, Object.hasOwn(data, 'description'), data.description ?? null, experienceId, resumeId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Experience entry not found');
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

export async function deleteExperience(experienceId, resumeId) {
  const result = await pool.query(
    'DELETE FROM experience WHERE id = $1 AND resume_id = $2 RETURNING id',
    [experienceId, resumeId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Experience entry not found');
    error.status = 404;
    throw error;
  }
  return { deleted: true };
}
