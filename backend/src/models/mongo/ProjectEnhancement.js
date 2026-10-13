/**
 * MongoDB Project Enhancement model.
 * 
 * Stores the AI-generated enhanced version of a project description,
 * along with the original for before/after comparison.
 * 
 * The enhancement is role-specific — the same project description might
 * be enhanced differently for a "Backend Engineer" vs "Full Stack" role.
 */
import mongoose from 'mongoose';

const projectEnhancementSchema = new mongoose.Schema({
  // Which resume and project this enhancement belongs to
  pg_resume_id: { type: String, required: true, index: true },
  pg_project_id: { type: String, required: true },

  // The target role this enhancement was optimized for
  target_role: { type: String, required: true },

  // Original description (as entered by the user)
  original_description: { type: String, required: true },

  // AI-enhanced description (role-tailored)
  enhanced_description: { type: String, required: true },

  // What specifically changed, with explanations
  changes: [{
    type: {
      type: String,
      enum: ['added_metric', 'stronger_verb', 'technical_detail', 'impact_statement', 'keyword_insertion', 'restructured'],
    },
    original_text: String,
    enhanced_text: String,
    reason: String, // WHY this change improves the description
  }],

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
  collection: 'project_enhancements',
});

export default mongoose.model('ProjectEnhancement', projectEnhancementSchema);
