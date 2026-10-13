/**
 * MongoDB Simulation Report model.
 * 
 * Stores the result of a Resume-to-JD match simulation.
 * This combines:
 * 1. Keyword matching (exact text overlap)
 * 2. Semantic matching (vector similarity via Qdrant)
 * 3. AI analysis (gap identification, fit assessment)
 * 
 * The simulation tells the user: "If you applied to this job with this
 * resume, here's how well you'd match — and here's exactly what's missing."
 */
import mongoose from 'mongoose';

const simulationReportSchema = new mongoose.Schema({
  pg_resume_id: { type: String, required: true, index: true },
  jd_mongo_id: { type: String, required: true, index: true },

  // Overall match percentage (0-100)
  match_score: { type: Number, required: true },

  // Keywords from the JD that were found in the resume
  matched_keywords: [{
    keyword: String,
    found_in_section: String, // Which resume section contains this keyword
    match_type: {
      type: String,
      enum: ['exact', 'semantic', 'partial'],  // How was it matched?
    },
  }],

  // Keywords from the JD that are MISSING from the resume
  missing_keywords: [{
    keyword: String,
    importance: { type: String, enum: ['high', 'medium', 'low'] },
    suggestion: String, // How to add this to the resume
  }],

  // Semantic similarity scores per section (from Qdrant)
  section_similarities: [{
    resume_section: String,
    jd_section: String,
    similarity_score: Number, // 0.0 to 1.0
  }],

  // AI-generated overall analysis
  analysis: {
    fit_assessment: String, // Overall narrative assessment
    strengths: [String],    // What makes this resume a good fit
    gaps: [String],         // What's missing
    suggestions: [String],  // How to improve the match
  },

  // AI processing metadata
  ai_metadata: {
    model_used: String,
    prompt_template: String,
    raw_response: String,
    response_parsed_successfully: Boolean,
    processing_time_ms: Number,
  },
}, {
  timestamps: true,
  collection: 'simulation_reports',
});

export default mongoose.model('SimulationReport', simulationReportSchema);
