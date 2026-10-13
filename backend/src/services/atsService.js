/**
 * ATS analysis service. AI supplies per-section scores and written evidence;
 * the overall score is a deterministic weighted sum of those scores.
 */
import { generateJson } from '../utils/ollamaService.js';
import { getATSAnalysisPrompt } from '../prompts/atsPrompts.js';
import { ATSReport, JobDescription, ResumeDocument } from '../models/mongo/index.js';
import { pool } from '../config/db.js';

const SCORE_WEIGHTS = { formatting: 15, keyword: 25, content: 20, achievements: 20, projects: 20 };
const SECTION_ALIASES = {
  contact: 'contact', education: 'education', experience: 'experience',
  projects: 'projects', impact: 'projects', skills: 'skills', keyword: 'skills',
  keywords: 'skills', certifications: 'certifications', formatting: 'formatting',
  format: 'formatting', general: 'general', other: 'general',
};
const clampScore = value => Math.round(Math.min(100, Math.max(0, Number(value))));

export async function generateATSReport(resumeId, userId, jdText) {
  const pgResult = await pool.query('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [resumeId, userId]);
  if (pgResult.rows.length === 0) { const error = new Error('Resume not found'); error.status = 404; throw error; }
  const pgResume = pgResult.rows[0];
  const mongoResume = await ResumeDocument.findById(pgResume.mongo_doc_id).lean();
  if (!mongoResume) throw new Error('Resume content missing');

  const prompt = getATSAnalysisPrompt(JSON.stringify(mongoResume.content, null, 2), jdText);
  const aiResult = await generateJson(prompt, 'You are an expert ATS analyzer.', undefined, { temperature: 0, seed: 42, num_predict: 320 });
  const rawScores = aiResult.section_scores || {};
  const rawSectionScores = {
    formatting: rawScores.formatting,
    keyword: rawScores.keyword ?? rawScores.keywords,
    content: rawScores.content,
    achievements: rawScores.achievements,
    projects: rawScores.projects ?? rawScores.impact,
  };
  if (Object.values(rawSectionScores).some(value => !Number.isFinite(Number(value)))) {
    const error = new Error('AI returned an incomplete ATS score breakdown. Please retry the analysis.'); error.status = 502; throw error;
  }

  const sectionScores = Object.fromEntries(Object.entries(rawSectionScores).map(([section, value]) => [section, clampScore(value)]));
  const contributions = Object.fromEntries(Object.entries(SCORE_WEIGHTS).map(([section, weight]) => [section, Math.round(weight * sectionScores[section] / 100)]));
  const overallScore = Object.values(contributions).reduce((total, points) => total + points, 0);
  const aiDeductions = Array.isArray(aiResult.deductions) ? aiResult.deductions : [];
  const deductionSections = { formatting: 'formatting', keyword: 'skills', content: 'general', achievements: 'experience', projects: 'projects' };
  const deductions = Object.entries(SCORE_WEIGHTS).flatMap(([category, weight]) => {
    const points = weight - contributions[category];
    if (!points) return [];
    const related = aiDeductions.find(item => SECTION_ALIASES[String(item.section || '').toLowerCase()] === deductionSections[category]);
    return [{
      section: deductionSections[category],
      reason: related?.reason || `${category[0].toUpperCase()}${category.slice(1)} score: ${sectionScores[category]}/100.`,
      points,
      severity: points >= 10 ? 'major' : points >= 5 ? 'minor' : 'suggestion',
    }];
  });
  const strengths = (Array.isArray(aiResult.strengths) ? aiResult.strengths : []).map(item => typeof item === 'string' ? { reason: item } : { section: item.section, reason: item.reason || item.text || 'Positive resume evidence.' });
  const recommendations = (Array.isArray(aiResult.recommendations) ? aiResult.recommendations : []).map(item => typeof item === 'string' ? { text: item } : { text: item.text || item.recommendation || 'Review this resume section.', priority: item.priority, target_section: item.target_section });
  const jdDoc = await JobDescription.create({ user_id: userId, raw_text: jdText });
  const storedSectionScores = {
    formatting: { score: sectionScores.formatting, max: 100 },
    keyword: { score: sectionScores.keyword, max: 100 },
    content: { score: sectionScores.content, max: 100 },
    achievements: { score: sectionScores.achievements, max: 100 },
    projects: { score: sectionScores.projects, max: 100 },
    skills: { score: sectionScores.keyword, max: 100 },
    experience: { score: sectionScores.content, max: 100 },
    education: { score: Number(rawScores.education) || 0, max: 100 },
    contact: { score: Number(rawScores.contact) || 0, max: 100 },
  };
  const reportDoc = await ATSReport.create({
    pg_resume_id: pgResume.id,
    jd_mongo_id: jdDoc._id,
    overall_score: overallScore,
    section_scores: storedSectionScores,
    strengths,
    deductions,
    recommendations,
    ai_metadata: { model_used: 'qwen2.5:7b-instruct', processing_time_ms: 0 },
  });
  const summaryResult = await pool.query(
    `INSERT INTO ats_reports_summary (resume_id, jd_mongo_id, ats_score, mongo_report_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [resumeId, jdDoc._id.toString(), overallScore, reportDoc._id.toString()]
  );

  return {
    summary: summaryResult.rows[0],
    details: reportDoc,
    overall_score: overallScore,
    section_scores: storedSectionScores,
    score_weights: SCORE_WEIGHTS,
    strengths: reportDoc.strengths,
    deductions: reportDoc.deductions,
    weaknesses: reportDoc.deductions.map(item => item.reason),
    recommendations: reportDoc.recommendations.map(item => item.text),
    matched_keywords: Array.isArray(aiResult.matched_keywords) ? aiResult.matched_keywords : [],
    missing_keywords: Array.isArray(aiResult.missing_keywords) ? aiResult.missing_keywords : [],
    reasoning: aiResult.reasoning || '',
  };
}
