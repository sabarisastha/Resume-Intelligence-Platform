/**
 * Centralized config — reads from process.env (loaded by dotenv in server.js).
 * 
 * Every environment variable the app uses should be listed here, so there's
 * one place to look up "what config does this app need?" instead of hunting
 * through scattered process.env references.
 */
const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // PostgreSQL
  pg: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5433', 10),
    user: process.env.PG_USER || 'rip_user',
    password: process.env.PG_PASSWORD || 'rip_password',
    database: process.env.PG_DATABASE || 'rip_db',
  },

  // MongoDB
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/rip_db',

  // Qdrant vector database
  qdrant: {
    host: process.env.QDRANT_HOST || 'localhost',
    port: parseInt(process.env.QDRANT_PORT || '6333', 10),
  },

  // JWT authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-fallback-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Ollama (local AI models)
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    chatModel: process.env.OLLAMA_CHAT_MODEL || 'qwen2.5:7b-instruct',
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
  },
};

export default config;
