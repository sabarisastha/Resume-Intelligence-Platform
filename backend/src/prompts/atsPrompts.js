/**
 * ATS Prompt templates.
 * Kept separate from business logic for maintainability.
 */

export const getATSAnalysisPrompt = (resumeText, jobDescription) => `
Analyze the resume against the job description as an expert ATS reviewer.
Use only evidence present in the resume. Do not claim that a skill, experience,
achievement, or credential is missing when it appears anywhere in the resume.
Explain every score and recommendation. Do not invent facts or metrics.
Keep the response very concise: at most 5 matched keywords, 5 missing keywords,
2 strengths, 3 deductions, and 2 recommendations. Keep each item under 12 words
and the rationale to one sentence. Return every required field, using [] when empty.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Output a strictly valid JSON object matching this exact schema:
{
  "section_scores": {
    "formatting": <number 0-100>,
    "keyword": <number 0-100>,
    "content": <number 0-100>,
    "achievements": <number 0-100>,
    "projects": <number 0-100>
  },
  "strengths": [
    "<string explaining a specific strength>"
  ],
  "matched_keywords": ["<keyword explicitly found in the resume>"],
  "missing_keywords": ["<job keyword not present in the resume>"],
  "deductions": [
    {
      "section": "<string: contact|education|experience|projects|skills|certifications|formatting|general>",
      "reason": "<string explaining exactly why points were deducted>",
      "points_deducted": <number>
    }
  ],
  "recommendations": [
    "<string explaining a specific, actionable improvement>"
  ],
  "reasoning": "<string: a 2-3 sentence overall summary of your scoring rationale>"
}
`;
