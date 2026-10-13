/**
 * Education CRUD service (weak entity — belongs to a resume).
 */
import { pool } from '../config/db.js';

export async function addEducation(resumeId, data) {
  const { institution, degree, field_of_study, start_date, end_date, grade } = data;
  const result = await pool.query(
    `INSERT INTO education (resume_id, institution, degree, field_of_study, start_date, end_date, grade)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [resumeId, institution, degree || null, field_of_study || null, start_date || null, end_date || null, grade || null]
  );
  return result.rows[0];
}

export async function getEducationByResume(resumeId) {
  const result = await pool.query(
    'SELECT * FROM education WHERE resume_id = $1 ORDER BY start_date DESC',
    [resumeId]
  );
  return result.rows;
}

export async function updateEducation(educationId, resumeId, data) {
  const result = await pool.query(
    `UPDATE education SET institution = CASE WHEN $1 THEN $2 ELSE institution END,
                          degree = CASE WHEN $3 THEN $4 ELSE degree END,
                          field_of_study = CASE WHEN $5 THEN $6 ELSE field_of_study END,
                          start_date = CASE WHEN $7 THEN $8 ELSE start_date END,
                          end_date = CASE WHEN $9 THEN $10 ELSE end_date END,
                          grade = CASE WHEN $11 THEN $12 ELSE grade END
     WHERE id = $13 AND resume_id = $14 RETURNING *`,
    [Object.hasOwn(data, 'institution'), data.institution ?? null, Object.hasOwn(data, 'degree'), data.degree ?? null,
      Object.hasOwn(data, 'field_of_study'), data.field_of_study ?? null, Object.hasOwn(data, 'start_date'), data.start_date || null,
      Object.hasOwn(data, 'end_date'), data.end_date || null, Object.hasOwn(data, 'grade'), data.grade ?? null, educationId, resumeId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Education entry not found');
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

export async function deleteEducation(educationId, resumeId) {
  const result = await pool.query(
    'DELETE FROM education WHERE id = $1 AND resume_id = $2 RETURNING id',
    [educationId, resumeId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Education entry not found');
    error.status = 404;
    throw error;
  }
  return { deleted: true };
}
