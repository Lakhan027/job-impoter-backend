import { Worker } from 'bullmq';
import { redis } from './config/redisClient.js';
import Job from './models/Job.js';

export function startWorker() {
  const worker = new Worker(
    'jobQueue',
    async (job) => {
      const data = job.data;

      try {
        // Normalize GUID to ensure it’s always a string
        const guid =
          typeof data.guid === 'object'
            ? data.guid._ || JSON.stringify(data.guid)
            : data.guid;

        // Save or update job
        await Job.updateOne({ guid }, { ...data, guid }, { upsert: true });

        console.log(`✅ Processed job ${job.id}`);
      } catch (err) {
        console.error(`❌ Job ${job.id} failed: ${err.message}`);
      }
    },
    { connection: redis }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed: ${err.message}`);
  });

  console.log('👷 Worker started (concurrency 5)');
  return worker;
}
