/**
 * MongoDB Resume Document model.
 * 
 * This stores the FULL rendered resume content as a flexible JSON document,
 * complementing the structured Postgres tables. The Postgres `resumes` table
 * stores the relational metadata (user ownership, title, target role), while
 * this document stores the actual content snapshot — everything needed to
 * render or export the resume as a PDF.
 * 
 * Why both? Postgres enforces structure and relationships ("which user owns
 * this resume?"). MongoDB stores the variable-shape content that would require
 * constant schema migrations in Postgres (nested sections, formatting options,
 * version history with arbitrary diffs).
 * 
 * The Postgres row's `mongo_doc_id` field points to this document's `_id`.
 */
import mongoose from 'mongoose';

const resumeDocumentSchema = new mongoose.Schema({
  // Reference back to the Postgres resume row.
  // Stored as a string (UUID format) since Postgres uses UUIDs, not ObjectIds.
  pg_resume_id: { type: String, required: true, index: true },

  // The full resume content, organized by section.
  // This is the "rendered" version — what actually appears on the resume document.
  content: {
    personal_info: {
      full_name: String,
      email: String,
      phone: String,
      linkedin_url: String,
      github_url: String,
      portfolio_url: String,
      profile_photo_data: String,
    },
    summary: String,
    additional_info: [{
      title: String,
      content: String,
    }],
    education: [{
      institution: String,
      degree: String,
      field_of_study: String,
      start_date: String,
      end_date: String,
      grade: String,
    }],
    experience: [{
      company: String,
      role: String,
      start_date: String,
      end_date: String,
      is_current: Boolean,
      description: String,
    }],
    projects: [{
      title: String,
      description: String,
      tech_stack: [String],
      github_link: String,
      live_link: String,
    }],
    skills: [{
      name: String,
      category: String,
      proficiency: String,
    }],
    certifications: [{
      name: String,
      issuer: String,
      issue_date: String,
    }],
  },

  // Template/formatting preferences for PDF export
  template_config: {
    template_id: String,
    font_size: { type: Number, default: 11 },
    margin: { type: Number, default: 40 },
  },

  // Preserve the original upload so users can keep or download its exact layout.
  original_file: {
    filename: String,
    mime_type: String,
    data: String,
  },

  // Version history — each time the resume is saved, a snapshot is pushed here.
  // This lets users see how their resume evolved over time.
  versions: [{
    content_snapshot: mongoose.Schema.Types.Mixed,
    saved_at: { type: Date, default: Date.now },
    label: String, // Optional — "Before ATS optimization", "v2", etc.
  }],
}, {
  timestamps: true, // Adds createdAt, updatedAt automatically
  collection: 'resumes', // Explicit collection name
});

export default mongoose.model('ResumeDocument', resumeDocumentSchema);
