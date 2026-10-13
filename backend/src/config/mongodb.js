/**
 * MongoDB connection via Mongoose.
 * 
 * Mongoose is used (instead of the raw MongoDB driver) because it provides
 * schema validation for our document collections — even though MongoDB is
 * "schema-less," we still want to enforce expected shapes at the application
 * level, especially for the ATS report and resume snapshot documents.
 */
import mongoose from 'mongoose';
import config from './index.js';

export async function connectMongo() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('[MongoDB] Connected —', config.mongoUri);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error.message);
    throw error;
  }
}
