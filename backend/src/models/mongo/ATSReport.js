/**
 * MongoDB ATS Report model.
 * 
 * This is where the FULL score breakdown lives — the { reason, points }
 * explanation array that is the core of RIP's "explainable scoring" promise.
 * 
 * The Postgres ats_reports_summary table only stores the numeric score
 * and a reference (mongo_report_id) pointing here. The split exists because:
 * - Postgres is fast for dashboard queries like "show ATS score history"
 * - MongoDB is right for the variable-shape explanation content
 * 
 * Every field in this document contributes to answering "WHY this score?"
 * — this is the non-negotiable principle of the entire platform.
 */
import mongoose from 'mongoose';

const atsReportSchema = new mongoose.Schema({
  // References back to Postgres
  pg_resume_id: { type: String, required: true, index: true },
  jd_mongo_id: String, // Optional — if scored against a specific JD

  // The overall score (0-100) — also stored in Postgres for quick queries
  overall_score: { type: Number, required: true },

  // === THE CORE: Explainable scoring ===
  // Each deduction explains WHY points were lost.
  // This array is what makes RIP different from tools that just output a number.
  deductions: [{
    // Which section of the resume this deduction applies to
    section: {
      type: String,
      enum: ['contact', 'education', 'experience', 'projects', 'skills', 'certifications', 'formatting', 'general'],
    },
    // Plain-language explanation — e.g. "Missing GitHub Profile"
    reason: { type: String, required: true },
    // How many points were deducted
    points: { type: Number, required: true },
    // Severity helps the UI decide how to style the annotation
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor', 'suggestion'],
      default: 'major',
    },
  }],

  // Positive findings — what the resume does well
  strengths: [{
    section: String,
    reason: { type: String, required: true },
    points: Number, // Points "earned" (positive)
  }],

  // Actionable recommendations to improve the score
  recommendations: [{
    text: { type: String, required: true },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    // Which section this recommendation targets
    target_section: String,
  }],

  // Section-level breakdown — score per resume section
  section_scores: {
    contact: { score: Number, max: Number },
    education: { score: Number, max: Number },
    experience: { score: Number, max: Number },
    projects: { score: Number, max: Number },
    skills: { score: Number, max: Number },
    formatting: { score: Number, max: Number },
    keyword: { score: Number, max: Number },
    content: { score: Number, max: Number },
    achievements: { score: Number, max: Number },
  },

  // The raw prompt sent to the model and the raw response received.
  // Stored for debugging and for explaining in a viva how the AI layer works.
  ai_metadata: {
    model_used: String,
    prompt_template: String,
    raw_response: String,
    response_parsed_successfully: Boolean,
    processing_time_ms: Number,
  },
}, {
  timestamps: true,
  collection: 'ats_reports',
});

export default mongoose.model('ATSReport', atsReportSchema);
