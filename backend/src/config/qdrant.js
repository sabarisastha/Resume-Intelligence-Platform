/**
 * Qdrant vector database client.
 * 
 * Qdrant is used for semantic similarity search between resume content
 * and job description content. We store per-section embeddings (not
 * whole-resume) so matching is granular — "built REST APIs" can match
 * against a JD asking for "backend service development."
 * 
 * Collection setup (creating the collection + configuring vector dimensions)
 * happens here, not in a migration script, because Qdrant's createCollection
 * is idempotent when using the `on_disk` option.
 */
import { QdrantClient } from '@qdrant/js-client-rest';
import config from './index.js';

const qdrantClient = new QdrantClient({
  host: config.qdrant.host,
  port: config.qdrant.port,
});

// nomic-embed-text produces 768-dimensional vectors
const VECTOR_SIZE = 768;
const COLLECTION_NAME = 'resume_chunks';

/**
 * Verify Qdrant is reachable and ensure our collection exists.
 * If the collection already exists, this is a no-op.
 */
export async function connectQdrant() {
  try {
    // Check if Qdrant is reachable
    const collections = await qdrantClient.getCollections();
    console.log('[Qdrant] Connected — collections:', collections.collections.length);

    // Ensure our collection exists
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`[Qdrant] Created collection '${COLLECTION_NAME}' (${VECTOR_SIZE}d, Cosine)`);
    } else {
      console.log(`[Qdrant] Collection '${COLLECTION_NAME}' already exists`);
    }
  } catch (error) {
    console.error('[Qdrant] Connection failed:', error.message);
    throw error;
  }
}

export { qdrantClient, COLLECTION_NAME, VECTOR_SIZE };
