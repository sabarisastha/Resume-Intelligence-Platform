/**
 * Resume service — CRUD operations for resumes with cross-DB synchronization.
 * 
 * CRITICAL ARCHITECTURE RULE (cross-database write ordering):
 * When creating a resume, we must:
 * 1. Create the MongoDB document FIRST (full resume content snapshot)
 * 2. Get its _id
 * 3. THEN create the Postgres row with mongo_doc_id referencing that _id
 * 
 * Why this order? If step 3 fails, we have an orphan MongoDB doc (acceptable,
 * can be cleaned up later). If we did it backwards, we'd have a Postgres row
 * pointing to a non-existent MongoDB doc (broken reference, much worse —
 * every read of that resume would fail).
 * 
 * The same principle applies to ATS reports: write Mongo report first,
 * then Postgres summary row.
 */
import { pool } from '../config/db.js';
import { ResumeDocument } from '../models/mongo/index.js';

/**
 * Create a new resume.
 * @param {string} userId - The user's Postgres UUID
 * @param {Object} data - { title, target_role, template_id? }
 * @returns {Object} The created Postgres resume row
 */
export async function createResume(userId, data) {
  const { title, target_role = data.targetRole, template_id = data.templateId } = data;

  // Step 1: Create the MongoDB document FIRST
  // This stores the full renderable content (initially empty sections)
  const mongoDoc = await ResumeDocument.create({
    pg_resume_id: 'pending', // Will be updated after Postgres insert
    content: {
      personal_info: {},
      summary: '',
      education: [],
      experience: [],
      projects: [],
      skills: [],
      certifications: [],
    },
    template_config: { template_id: template_id || 'default' },
    versions: [],
  });

  // Step 2: Create the Postgres row with the MongoDB reference
  const result = await pool.query(
    `INSERT INTO resumes (user_id, title, target_role, template_id, mongo_doc_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, title, target_role || null, template_id || null, mongoDoc._id.toString()]
  );

  const pgResume = result.rows[0];

  // Step 3: Update the MongoDB doc with the actual Postgres resume ID
  // (we couldn't set this in step 1 because we didn't have it yet)
  await ResumeDocument.findByIdAndUpdate(mongoDoc._id, {
    pg_resume_id: pgResume.id,
  });

  return pgResume;
}

/** Create a resume and persist deterministic parser output into both stores. */
export async function createResumeFromImport(userId, content, originalFile) {
  const title = content.personal_info?.full_name
    ? `${content.personal_info.full_name}'s Uploaded Resume`
    : 'Uploaded Resume';
  const resume = await createResume(userId, { title, target_role: 'Imported', template_id: 'original' });
  const dateValue = value => /^\d{4}-\d{2}$/.test(value || '') ? `${value}-01` : value || null;
  try {
  for (const item of content.education || []) {
    if (item.institution) await pool.query(
      `INSERT INTO education (resume_id, institution, degree, field_of_study, start_date, end_date, grade)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [resume.id, item.institution, item.degree || null, item.field_of_study || null, dateValue(item.start_date), dateValue(item.end_date), item.grade || null]
    );
  }
  for (const item of content.experience || []) {
    if (item.company) await pool.query(
      `INSERT INTO experience (resume_id, company, role, start_date, end_date, is_current, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [resume.id, item.company, item.role || null, dateValue(item.start_date), dateValue(item.end_date), Boolean(item.is_current), item.description || null]
    );
  }
  for (const item of content.projects || []) {
    if (item.title) await pool.query(
      `INSERT INTO projects (resume_id, title, description, tech_stack, github_link, live_link)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [resume.id, item.title, item.description || null, item.tech_stack || [], item.github_link || null, item.live_link || null]
    );
  }
  for (const item of content.certifications || []) {
    if (item.name) await pool.query(
      `INSERT INTO certifications (resume_id, name, issuer, issue_date) VALUES ($1,$2,$3,$4)`,
      [resume.id, item.name, item.issuer || null, dateValue(item.issue_date)]
    );
  }
  if (content.skills?.length) {
    const { setSkillsForResume } = await import('./skillService.js');
    await setSkillsForResume(resume.id, content.skills.map(skill => typeof skill === 'string' ? { name: skill } : skill).filter(skill => skill.name && skill.name.length <= 100));
  }

  await syncResumeToMongo(resume.id, userId);
  const savedResume = await pool.query('SELECT mongo_doc_id FROM resumes WHERE id = $1', [resume.id]);
  await ResumeDocument.findByIdAndUpdate(savedResume.rows[0].mongo_doc_id, {
    $set: {
      'content.personal_info': content.personal_info || {},
      'content.summary': content.summary || '',
      ...(originalFile ? { original_file: {
        filename: originalFile.originalname,
        mime_type: originalFile.mimetype,
        data: originalFile.buffer.toString('base64'),
      } } : {}),
      ...(originalFile ? { 'template_config.template_id': 'original' } : {}),
    },
  });
  return resume;
  } catch (error) {
    await deleteResume(resume.id, userId).catch(cleanupError => console.warn('[ResumeService] Failed to roll back imported resume:', cleanupError.message));
    throw error;
  }
}

/**
 * Get all resumes for a user.
 * Returns Postgres rows (lightweight, for dashboard listing).
 */
export async function getResumesByUser(userId) {
  const result = await pool.query(
    `SELECT r.*, 
            (SELECT ats_score FROM ats_reports_summary 
             WHERE resume_id = r.id ORDER BY created_at DESC LIMIT 1) as latest_ats_score
     FROM resumes r 
     WHERE r.user_id = $1 
     ORDER BY r.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a single resume by ID (with ownership check).
 * Returns both the Postgres row and the MongoDB content document.
 */
export async function getResumeById(resumeId, userId) {
  const result = await pool.query(
    'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Resume not found');
    error.status = 404;
    throw error;
  }

  const pgResume = result.rows[0];

  // Fetch the full content from MongoDB
  let mongoDoc = null;
  if (pgResume.mongo_doc_id) {
    mongoDoc = await ResumeDocument.findById(pgResume.mongo_doc_id).lean();
  }

  return { ...pgResume, mongo_content: mongoDoc };
}

/**
 * Update resume metadata (title, target_role, template_id).
 */
export async function updateResume(resumeId, userId, data) {
  const { title, target_role = data.targetRole, template_id = data.templateId } = data;
  const result = await pool.query(
    `UPDATE resumes SET title = CASE WHEN $1 THEN $2 ELSE title END,
                        target_role = CASE WHEN $3 THEN $4 ELSE target_role END,
                        template_id = CASE WHEN $5 THEN $6 ELSE template_id END
     WHERE id = $7 AND user_id = $8
     RETURNING *`,
    [Object.hasOwn(data, 'title'), title ?? null,
      Object.hasOwn(data, 'target_role') || Object.hasOwn(data, 'targetRole'), target_role ?? null,
      Object.hasOwn(data, 'template_id') || Object.hasOwn(data, 'templateId'), template_id ?? null,
      resumeId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Resume not found');
    error.status = 404;
    throw error;
  }

  const updated = result.rows[0];
  if (updated.mongo_doc_id && (data.personal_info !== undefined || data.summary !== undefined || data.additional_info !== undefined || data.template_config !== undefined || template_id !== undefined)) {
    const set = {};
    if (data.personal_info !== undefined) set['content.personal_info'] = data.personal_info;
    if (data.summary !== undefined) set['content.summary'] = data.summary;
    if (data.additional_info !== undefined) set['content.additional_info'] = data.additional_info;
    if (data.template_config !== undefined) set.template_config = data.template_config;
    else if (template_id !== undefined) set['template_config.template_id'] = template_id;
    await ResumeDocument.findByIdAndUpdate(updated.mongo_doc_id, { $set: set });
  }
  return updated;
}

/**
 * Delete a resume (cascades in Postgres, manually clean MongoDB).
 */
export async function deleteResume(resumeId, userId) {
  // Get the mongo_doc_id before deleting from Postgres
  const result = await pool.query(
    'SELECT mongo_doc_id FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Resume not found');
    error.status = 404;
    throw error;
  }

  // Delete from Postgres (cascades to all weak entity tables)
  await pool.query('DELETE FROM resumes WHERE id = $1', [resumeId]);

  // Clean up the MongoDB document
  // This is best-effort — if it fails, we have an orphan, which is acceptable
  const mongoDocId = result.rows[0].mongo_doc_id;
  if (mongoDocId) {
    try {
      await ResumeDocument.findByIdAndDelete(mongoDocId);
    } catch (err) {
      console.warn('[ResumeService] Failed to delete MongoDB doc:', mongoDocId, err.message);
    }
  }

  // Clean up Qdrant vector chunks
  try {
    const { deleteResumeChunks } = await import('./vectorService.js');
    await deleteResumeChunks(resumeId);
  } catch (err) {
    console.warn('[ResumeService] Failed to delete Qdrant chunks:', err.message);
  }

  return { deleted: true };
}

/**
 * Sync the full resume content to MongoDB.
 * Called after any section (education, experience, etc.) is updated,
 * so the MongoDB document always reflects the current state.
 */
export async function syncResumeToMongo(resumeId, userId) {
  // Fetch the Postgres resume to get the mongo_doc_id
  const resumeResult = await pool.query(
    'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
    [resumeId, userId]
  );
  if (resumeResult.rows.length === 0) return;
  const resume = resumeResult.rows[0];
  if (!resume.mongo_doc_id) return;

  // Fetch user info for personal_info section
  const userResult = await pool.query(
    'SELECT full_name, email, phone, linkedin_url, github_url, portfolio_url FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  const existingDoc = await ResumeDocument.findById(resume.mongo_doc_id).lean();

  // Fetch all sections from Postgres
  const [eduResult, expResult, projResult, certResult, skillsResult] = await Promise.all([
    pool.query('SELECT * FROM education WHERE resume_id = $1 ORDER BY start_date DESC', [resumeId]),
    pool.query('SELECT * FROM experience WHERE resume_id = $1 ORDER BY start_date DESC', [resumeId]),
    pool.query('SELECT * FROM projects WHERE resume_id = $1', [resumeId]),
    pool.query('SELECT * FROM certifications WHERE resume_id = $1 ORDER BY issue_date DESC', [resumeId]),
    pool.query(
      `SELECT s.name, s.category, rs.proficiency 
       FROM resume_skills rs JOIN skills s ON rs.skill_id = s.id 
       WHERE rs.resume_id = $1`,
      [resumeId]
    ),
  ]);

  // Update the MongoDB document with current content
  await ResumeDocument.findByIdAndUpdate(resume.mongo_doc_id, {
    content: {
      personal_info: existingDoc?.content?.personal_info || {
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        linkedin_url: user.linkedin_url,
        github_url: user.github_url,
        portfolio_url: user.portfolio_url,
      },
      summary: existingDoc?.content?.summary || '',
      additional_info: existingDoc?.content?.additional_info || [],
      education: eduResult.rows,
      experience: expResult.rows,
      projects: projResult.rows,
      skills: skillsResult.rows,
      certifications: certResult.rows,
    },
  });
}
