import mongoose from 'mongoose';
import pino from 'pino';
const logger = pino();

export default async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/job_importer';
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri, { });
  logger.info('MongoDB connected');
}
