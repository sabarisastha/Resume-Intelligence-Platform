/**
 * MongoDB Job Description model.
 * 
 * Stores uploaded/pasted job descriptions along with keywords extracted
 * by the AI layer. This is a document store use case because:
 * 1. JD text is unstructured and variable-length
 * 2. Extracted keywords are a variable-shape array with metadata
 * 3. We don't need relational joins on JD data — it's always accessed
 *    by ID or by the user who uploaded it
 */
import mongoose from 'mongoose';

const jobDescriptionSchema = new mongoose.Schema({
  // Which user uploaded this JD
  user_id: { type: String, required: true, index: true },

  // Raw text of the job description as pasted/uploaded by the user
  raw_text: { type: String, required: true },

  // Job metadata extracted from the JD (either by AI or user input)
  job_title: String,
  company: String,

  // Keywords extracted by the AI layer (qwen2.5:7b-instruct).
  // Each keyword has:
  // - text: the keyword itself ("React", "distributed systems", etc.)
  // - category: what type of requirement it represents
  // - importance: how critical it is to the role (high/medium/low)
  extracted_keywords: [{
    text: { type: String, required: true },
    category: {
      type: String,
      enum: ['technical_skill', 'soft_skill', 'tool', 'domain', 'qualification', 'other'],
      default: 'other',
    },
    importance: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
  }],

  // Sections extracted from the JD for per-section embedding in Qdrant
  sections: [{
    heading: String,
    content: String,
  }],
}, {
  timestamps: true,
  collection: 'job_descriptions',
});

export default mongoose.model('JobDescription', jobDescriptionSchema);
