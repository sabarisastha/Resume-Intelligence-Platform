/**
 * Project CRUD service (weak entity — belongs to a resume).
 * 
 * Note: tech_stack is stored as a Postgres TEXT[] array.
 * When inserting/updating, we pass it as a JSON array and Postgres handles it.
 */
import { pool } from '../config/db.js';

export async function addProject(resumeId, data) {
  const { title, description, tech_stack, github_link, live_link } = data;
  const result = await pool.query(
    `INSERT INTO projects (resume_id, title, description, tech_stack, github_link, live_link)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [resumeId, title, description || null, tech_stack || null, github_link || null, live_link || null]
  );
  return result.rows[0];
}

export async function getProjectsByResume(resumeId) {
  const result = await pool.query(
    'SELECT * FROM projects WHERE resume_id = $1',
    [resumeId]
  );
  return result.rows;
}

export async function updateProject(projectId, resumeId, data) {
  const result = await pool.query(
    `UPDATE projects SET title = CASE WHEN $1 THEN $2 ELSE title END,
                         description = CASE WHEN $3 THEN $4 ELSE description END,
                         tech_stack = CASE WHEN $5 THEN $6 ELSE tech_stack END,
                         github_link = CASE WHEN $7 THEN $8 ELSE github_link END,
                         live_link = CASE WHEN $9 THEN $10 ELSE live_link END
     WHERE id = $11 AND resume_id = $12 RETURNING *`,
    [Object.hasOwn(data, 'title'), data.title ?? null, Object.hasOwn(data, 'description'), data.description ?? null,
      Object.hasOwn(data, 'tech_stack'), data.tech_stack ?? null, Object.hasOwn(data, 'github_link'), data.github_link ?? null,
      Object.hasOwn(data, 'live_link'), data.live_link ?? null, projectId, resumeId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

export async function deleteProject(projectId, resumeId) {
  const result = await pool.query(
    'DELETE FROM projects WHERE id = $1 AND resume_id = $2 RETURNING id',
    [projectId, resumeId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }
  return { deleted: true };
}
