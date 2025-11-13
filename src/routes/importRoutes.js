import express from 'express';
import ImportLog from '../models/ImportLog.js';
import { enqueueFeeds } from '../services/fetchService.js'; // ✅ import service

const router = express.Router();

// ✅ List import logs (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ImportLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ImportLog.countDocuments(),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    console.error('❌ Failed to fetch import logs:', err);
    res.status(500).json({ error: 'Failed to fetch import logs' });
  }
});

// ✅ Get import detail by ID
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const log = await ImportLog.findById(id).lean();
    if (!log) return res.status(404).json({ error: 'Not found' });
    res.json(log);
  } catch (err) {
    console.error('❌ Failed to fetch import detail:', err);
    res.status(500).json({ error: 'Failed to fetch import detail' });
  }
});

// ✅ Trigger a new import manually
router.post('/start', async (req, res) => {
  try {
    const results = await enqueueFeeds(); // starts feed fetching
    res.status(200).json({
      message: 'Import started successfully',
      results,
    });
  } catch (err) {
    console.error('❌ Failed to start import:', err);
    res.status(500).json({ error: err.message || 'Import failed' });
  }
});

export default router;
