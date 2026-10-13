import { searchResumeChunks } from './vectorService.js';
import { generateJson } from '../utils/ollamaService.js';
import { SimulationReport, JobDescription, ResumeDocument } from '../models/mongo/index.js';
import { pool } from '../config/db.js';

const simulatorPrompt = (jdText, resumeChunks) => `
You are an advanced Job Match Simulator.
Based on the Job Description and the most relevant chunks from the applicant's resume (retrieved via Vector DB),
evaluate the match.

JOB DESCRIPTION:
${jdText}

RELEVANT RESUME CONTENT:
${resumeChunks}

Output a strictly valid JSON object:
{
  "match_score": <number 0-100>,
  "matched_keywords": ["up to 5 matched keywords"],
  "missing_keywords": [
    {
      "keyword": "<missing skill/concept>",
      "importance": "<high|medium|low>",
      "context": "<why it matters for this job>"
    }
  ],
  "analysis": "<Concise paragraph of at most 60 words explaining the score and main gaps>"
}
`;

export async function runSimulation(resumeId, userId, jdText) {
  // 1. Verify ownership
  const pgResult = await pool.query('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [resumeId, userId]);
  if (pgResult.rows.length === 0) { const error = new Error('Resume not found'); error.status = 404; throw error; }
  const pgResume = pgResult.rows[0];

  // Use stored resume text as the reliable context; semantic chunks are an optional supplement.
  const resumeDocument = await ResumeDocument.findById(pgResume.mongo_doc_id).lean();
  if (!resumeDocument) { const error = new Error('Resume content missing'); error.status = 404; throw error; }
  let searchResults = [];
  try { searchResults = await searchResumeChunks(resumeId, jdText, 10); }
  catch (error) { console.warn('[Simulator] Semantic retrieval unavailable; using saved resume content:', error.message); }
  const aggregatedChunks = searchResults.map(res => res.payload.content).join('\n\n--- \n\n');
  const resumeContext = aggregatedChunks || JSON.stringify(resumeDocument.content);

  // 3. Generate AI Simulation before creating persistent analysis artifacts.
  const prompt = simulatorPrompt(jdText, resumeContext);
  const aiResult = await generateJson(prompt, 'You are an expert Job Match Simulator.', undefined, { temperature: 0, seed: 42, num_predict: 220 });
  const modelScore = Number(aiResult.match_score);
  if (!Number.isFinite(modelScore) || modelScore < 0 || modelScore > 100) {
    const error = new Error('AI returned an invalid match score. Please retry the simulation.'); error.status = 502; throw error;
  }
  const jdDoc = await JobDescription.create({ user_id: userId, raw_text: jdText });

  // 5. Calculate simulated section similarities (mocked slightly based on Qdrant scores)
  const avgQdrantScore = searchResults.length > 0 
    ? searchResults.reduce((acc, val) => acc + val.score, 0) / searchResults.length 
    : 0;

  // 6. Save Simulation Report
  const simDoc = await SimulationReport.create({
    pg_resume_id: pgResume.id,
    jd_mongo_id: jdDoc._id,
    match_score: modelScore,
    matched_keywords: (aiResult.matched_keywords || []).map(keyword => typeof keyword === 'string' ? { keyword, match_type: 'exact' } : keyword),
    missing_keywords: (aiResult.missing_keywords || []).map(item => typeof item === 'string' ? { keyword: item, importance: 'medium' } : { ...item, suggestion: item.suggestion || item.context }),
    section_similarities: ['experience', 'skills', 'projects'].map(section => ({
      resume_section: section, jd_section: 'requirements',
      similarity_score: searchResults.some(s => s.payload.section === section) ? avgQdrantScore : 0,
    })),
    analysis: { fit_assessment: aiResult.analysis || 'Simulation completed.' },
    ai_metadata: {
      model_used: 'qwen2.5:7b-instruct',
    }
  });

  // 7. Update the summary in Postgres (Optional, but good for dashboard)
  await pool.query(
    `UPDATE ats_reports_summary SET match_score = $1 WHERE resume_id = $2 AND jd_mongo_id = $3`,
    [simDoc.match_score, resumeId, jdDoc._id.toString()]
  );

  return simDoc;
}
