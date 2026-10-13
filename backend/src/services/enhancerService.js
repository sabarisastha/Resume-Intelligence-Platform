import { generateJson } from '../utils/ollamaService.js';
import { getProjectEnhancementPrompt } from '../prompts/enhancerPrompts.js';
import { ProjectEnhancement } from '../models/mongo/index.js';
import { pool } from '../config/db.js';

export async function enhanceProject(projectId, userId, roleContext) {
  // 1. Fetch project and verify ownership via the resume
  const result = await pool.query(
    `SELECT p.*, p.resume_id FROM projects p 
     JOIN resumes r ON p.resume_id = r.id 
     WHERE p.id = $1 AND r.user_id = $2`,
    [projectId, userId]
  );
  if (result.rows.length === 0) { const error = new Error('Project not found'); error.status = 404; throw error; }
  const project = result.rows[0];

  if (!project.description) {
    throw new Error('Project has no description to enhance');
  }

  // 2. Generate enhancement
  const prompt = getProjectEnhancementPrompt(project.description, roleContext);
  const aiResult = await generateJson(prompt, 'You are an expert resume writer.', undefined, { temperature: 0, seed: 42, num_predict: 180 });
  if (typeof aiResult.enhanced_description !== 'string' || !aiResult.enhanced_description.trim()) {
    const error = new Error('AI returned an invalid project enhancement. Please retry.'); error.status = 502; throw error;
  }

  // 3. Save enhancement history to Mongo
  const enhancementDoc = await ProjectEnhancement.create({
    pg_resume_id: project.resume_id,
    pg_project_id: project.id,
    target_role: roleContext || 'General Software Engineering',
    original_description: project.description,
    enhanced_description: aiResult.enhanced_description,
    changes: (aiResult.changes_made || []).map(change => ({
      type: ({ clarity: 'restructured', star_method: 'restructured' })[change.type] || change.type || 'restructured',
      reason: change.reason || 'Improves clarity for the target role.',
    })),
    ai_metadata: {
      model_used: 'qwen2.5:7b-instruct',
    }
  });

  return enhancementDoc;
}

export async function enhanceJobDescriptionText(userId, text) {
  const prompt = `
You are an expert technical recruiter and copywriter.
Analyze and enhance the following job description to make it clearer, more professional, and better structured.
Also, extract up to 8 key skills and requirements. Keep the enhanced version under 100 words and list at most 2 concise improvements.

JOB DESCRIPTION:
${text}

OUTPUT SCHEMA:
{
  "enhanced_text": "The improved, well-structured version of the job description",
  "extracted_keywords": ["keyword1", "keyword2", "keyword3"],
  "improvements": ["List of changes you made to improve the text"]
}
`;

  const aiResult = await generateJson(prompt, 'You are an expert technical recruiter.', undefined, { temperature: 0, seed: 42, num_predict: 220 });
  if (typeof aiResult.enhanced_text !== 'string' || !Array.isArray(aiResult.extracted_keywords)) {
    const error = new Error('AI returned an invalid job description analysis. Please retry.'); error.status = 502; throw error;
  }
  
  // Return the result combined with the original text
  return {
    original_text: text,
    enhanced_text: aiResult.enhanced_text,
    extracted_keywords: aiResult.extracted_keywords,
    improvements: aiResult.improvements
  };
}
