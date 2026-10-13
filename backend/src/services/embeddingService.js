import axios from 'axios';
import config from '../config/index.js';

const ollama = axios.create({
  baseURL: config.ollama.baseUrl,
  timeout: 10000,
});

/**
 * Generate embeddings for a text string using Ollama's nomic-embed-text.
 * WHY: Provides vector representations of text for semantic search and AI matching
 * 
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} 768-dimensional float array
 */
export async function getEmbeddings(text) {
  try {
    const response = await ollama.post('/api/embeddings', {
      model: config.ollama.embedModel || 'nomic-embed-text',
      prompt: text
    });
    return response.data.embedding;
  } catch (error) {
    console.error('[EmbeddingService] Failed to generate embedding:', error?.response?.data || error.message);
    throw new Error('Embedding generation failed');
  }
}
