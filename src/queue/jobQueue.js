import { Queue, QueueScheduler } from 'bullmq';
import { redis } from '../config/redisClient.js';
import pino from 'pino';

const logger = pino();
let jobQueue;

export async function initQueue() {
  // QueueScheduler is required to enable retries/backoffs and stalled job handling
  new QueueScheduler('jobQueue', { connection: redis });
  jobQueue = new Queue('jobQueue', { connection: redis });
  logger.info('BullMQ queue initialized');
  return jobQueue;
}

export function getQueue() {
  if (!jobQueue) throw new Error('Queue not initialized. Call initQueue()');
  return jobQueue;
}
