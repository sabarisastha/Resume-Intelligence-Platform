import axios from 'axios';
import config from '../config/index.js';
import { safeJsonParse } from './safeJsonParse.js';

// Setup axios client for Ollama
const ollama = axios.create({
  baseURL: config.ollama.baseUrl,
  timeout: config.ollama.timeoutMs,
});

/**
 * Generate a structured JSON response from Ollama.
 * 
 * @param {string} prompt - The full prompt string
 * @param {string} systemMessage - Optional system instructions
 * @param {string} model - The model to use (defaults to qwen2.5:7b-instruct)
 * @returns {Promise<Object>} The parsed JSON response
 */
export async function generateJson(prompt, systemMessage = '', model = config.ollama.chatModel, generationOptions = {}) {
  try {
    const messages = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    messages.push({ role: 'user', content: prompt });

    // Enforce JSON output format requirement in the system prompt
    const enforcedSystem = (systemMessage ? systemMessage + '\n\n' : '') + 
      'You are a strict JSON API. You MUST output ONLY valid JSON. ' +
      'Do not include markdown code blocks (```json), do not include conversational text, ' +
      'and do not output anything before or after the JSON object.';

    // qwen2.5 supports the format: 'json' parameter
    const response = await ollama.post('/api/chat', {
      model: model,
      messages: [{ role: 'system', content: enforcedSystem }, { role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.1,
        ...generationOptions,
      }
    });

    const rawResponse = response.data.message.content;
    
    // Use our defensive parser just in case the model ignored format: 'json'
    const parsed = safeJsonParse(rawResponse);
    if (!parsed.success || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
      const error = new Error('AI returned invalid structured output. Please retry.'); error.status = 502; throw error;
    }
    return parsed.data;
    
  } catch (error) {
    console.error('[OllamaService] Generation failed:', { code: error.code, status: error.response?.status, message: error.message });
    if (error.status) throw error;
    const failure = new Error('AI analysis is unavailable or timed out. Please try again shortly.');
    failure.status = error.code === 'ECONNABORTED' ? 504 : error.response ? 502 : 503;
    failure.cause = error;
    throw failure;
  }
}
