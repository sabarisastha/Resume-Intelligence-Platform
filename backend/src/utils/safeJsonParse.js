/**
 * Defensive JSON parser for AI model responses.
 * 
 * The local LLM (qwen2.5:7b-instruct) is prompted to return strict JSON,
 * but it can still occasionally:
 * - Wrap JSON in markdown code fences (```json ... ```)
 * - Include explanatory text before/after the JSON
 * - Return truncated or malformed JSON
 * 
 * This utility handles those cases gracefully instead of crashing on
 * JSON.parse(). Used by every AI service that calls Ollama.
 */

/**
 * Attempt to parse a string as JSON, handling common LLM output quirks.
 * 
 * @param {string} raw - The raw string response from the LLM
 * @returns {{ success: boolean, data: any, error?: string }}
 *   - success: true if parsing succeeded, false otherwise
 *   - data: the parsed object (or null if failed)
 *   - error: human-readable error message if parsing failed
 */
export function safeJsonParse(raw) {
  if (!raw || typeof raw !== 'string') {
    return { success: false, data: null, error: 'Empty or non-string input' };
  }

  // Step 1: Try parsing the raw string directly
  // This handles the ideal case where the model returns clean JSON
  try {
    const data = JSON.parse(raw);
    return { success: true, data };
  } catch {
    // Fall through to more aggressive extraction
  }

  // Step 2: Strip markdown code fences
  // Models often wrap JSON in ```json ... ``` or ``` ... ```
  const fencePattern = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
  const fenceMatch = raw.match(fencePattern);
  if (fenceMatch) {
    try {
      const data = JSON.parse(fenceMatch[1].trim());
      return { success: true, data };
    } catch {
      // Fall through
    }
  }

  // Step 3: Find the first { or [ and the last } or ]
  // This handles cases where the model adds explanatory text around the JSON
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');
  const start = firstBrace === -1 ? firstBracket
              : firstBracket === -1 ? firstBrace
              : Math.min(firstBrace, firstBracket);

  if (start !== -1) {
    const isArray = raw[start] === '[';
    const lastClose = raw.lastIndexOf(isArray ? ']' : '}');
    if (lastClose > start) {
      try {
        const data = JSON.parse(raw.substring(start, lastClose + 1));
        return { success: true, data };
      } catch {
        // Fall through
      }
    }
  }

  // All strategies failed
  return {
    success: false,
    data: null,
    error: `Failed to extract JSON from model response (length: ${raw.length} chars). First 200 chars: ${raw.substring(0, 200)}`,
  };
}
