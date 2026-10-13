/**
 * Certification CRUD service (weak entity — belongs to a resume).
 */
import { pool } from '../config/db.js';

export async function addCertification(resumeId, data) {
  const { name, issuer, issue_date } = data;
  const result = await pool.query(
    `INSERT INTO certifications (resume_id, name, issuer, issue_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [resumeId, name, issuer || null, issue_date || null]
  );
  return result.rows[0];
}

export async function getCertificationsByResume(resumeId) {
  const result = await pool.query(
    'SELECT * FROM certifications WHERE resume_id = $1 ORDER BY issue_date DESC',
    [resumeId]
  );
  return result.rows;
}

export async function updateCertification(certId, resumeId, data) {
  const result = await pool.query(
    `UPDATE certifications SET name = CASE WHEN $1 THEN $2 ELSE name END,
                               issuer = CASE WHEN $3 THEN $4 ELSE issuer END,
                               issue_date = CASE WHEN $5 THEN $6 ELSE issue_date END
     WHERE id = $7 AND resume_id = $8 RETURNING *`,
    [Object.hasOwn(data, 'name'), data.name ?? null, Object.hasOwn(data, 'issuer'), data.issuer ?? null,
      Object.hasOwn(data, 'issue_date'), data.issue_date || null, certId, resumeId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Certification not found');
    error.status = 404;
    throw error;
  }
  return result.rows[0];
}

export async function deleteCertification(certId, resumeId) {
  const result = await pool.query(
    'DELETE FROM certifications WHERE id = $1 AND resume_id = $2 RETURNING id',
    [certId, resumeId]
  );
  if (result.rows.length === 0) {
    const error = new Error('Certification not found');
    error.status = 404;
    throw error;
  }
  return { deleted: true };
}
