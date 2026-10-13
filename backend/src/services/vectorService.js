/**
 * Qdrant Vector Service
 * Handles upserting and searching vectors in qdrantClient.
 * WHY: This layer abstracts Qdrant operations for resume data vectorization and semantic search
 */
import { qdrantClient } from '../config/qdrant.js';
import { getEmbeddings } from './embeddingService.js';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'resume_chunks';

/**
 * Upsert a chunk into qdrantClient.
 * 
 * @param {string} resumeId - The Postgres resume ID
 * @param {string} section - 'experience', 'skills', 'projects', etc.
 * @param {string} content - The text chunk
 */
export async function upsertResumeChunk(resumeId, section, content) {
  if (!content || content.trim().length === 0) return;

  const vector = await getEmbeddings(content);
  const pointId = uuidv4();

  await qdrantClient.upsert(COLLECTION_NAME, {
    wait: true,
    points: [{
      id: pointId,
      vector: vector,
      payload: {
        resume_id: resumeId,
        section: section,
        content: content,
      }
    }]
  });
}

/**
 * Delete all chunks for a given resume (used when deleting a resume).
 */
export async function deleteResumeChunks(resumeId) {
  await qdrantClient.delete(COLLECTION_NAME, {
    wait: true,
    filter: {
      must: [{
        key: 'resume_id',
        match: { value: resumeId }
      }]
    }
  });
}

/**
 * Search for the most relevant resume chunks matching a query (e.g. JD requirement).
 */
export async function searchResumeChunks(resumeId, queryText, limit = 5) {
  const queryVector = await getEmbeddings(queryText);
  
  const results = await qdrantClient.query(COLLECTION_NAME, {
    query: queryVector,
    filter: {
      must: [{
        key: 'resume_id',
        match: { value: resumeId }
      }]
    },
    limit: limit,
    with_payload: true,
  });

  return results.points || results;
}
