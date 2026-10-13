export const getProjectEnhancementPrompt = (projectDescription, roleContext) => `
Rewrite the following project description to maximize its impact for a resume.
Target Role Context: ${roleContext || 'General Software Engineering'}

Use the STAR method (Situation, Task, Action, Result) implicitly where the source supports it.
Do not invent metrics, tools, outcomes, or responsibilities. Preserve all factual claims and use only information in the original description.
Use strong action verbs.
Keep the rewritten description under 50 words and include at most 2 concise changes.

ORIGINAL DESCRIPTION:
${projectDescription}

Output a strictly valid JSON object matching this schema:
{
  "enhanced_description": "<string: The newly rewritten impactful description>",
  "changes_made": [
    {
      "type": "<string: 'added_metric' | 'stronger_verb' | 'clarity' | 'star_method'>",
      "reason": "<string: Explain exactly why you made this change>"
    }
  ]
}
`;
