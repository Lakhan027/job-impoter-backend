// server/src/index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pino from 'pino';
import cron from 'node-cron';

import connectDB from './utils/db.js';
import { initQueue } from './queue/jobQueue.js';
import importRoutes from './routes/importRoutes.js';
import { enqueueFeeds } from './services/fetchService.js';
import { startWorker } from './worker.js';

dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Handle invalid JSON bodies gracefully
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn(`⚠️ Invalid JSON: ${err.message}`);
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  next();
});

// Routes
app.use('/api/imports', importRoutes);

// Health check route (optional, for Render/Vercel)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectDB();
    logger.info('MongoDB connected');

    await initQueue();
    logger.info('BullMQ queue initialized');

    startWorker(); // 👷 start BullMQ worker

    // Start server
    app.listen(PORT, () => logger.info(`Server listening on ${PORT}`));

    // Cron schedule for hourly imports (default: top of every hour)
    const cronExpr = process.env.CRON_SCHEDULE || '0 * * * *';
    cron.schedule(cronExpr, async () => {
      logger.info('⏰ Cron triggered: enqueueing feeds');
      try {
        await enqueueFeeds();
      } catch (err) {
        logger.error({ err }, 'Failed during cron import');
      }
    });

    // Run once immediately on startup
    logger.info('Initial feed enqueue');
    await enqueueFeeds();
  } catch (err) {
    logger.error({ err }, 'Failed to start');
    process.exit(1);
  }
}

start();
