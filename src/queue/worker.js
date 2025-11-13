import { Worker } from 'bullmq';
import { redis } from '../config/redisClient.js';
import Job from '../models/Job.js';

export const worker = new Worker(
  'jobQueue',
  async (job) => {
    const data = job.data;
    await Job.updateOne({ guid: data.guid }, data, { upsert: true });
  },
  { connection: redis }
);

worker.on('completed', (job) => console.log(`✅ Job ${job.id} processed`));
worker.on('failed', (job, err) => console.error(`❌ Job ${job.id} failed: ${err.message}`));
