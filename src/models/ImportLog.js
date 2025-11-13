import mongoose from 'mongoose';

const ImportLogSchema = new mongoose.Schema({
  fileName: String,
  timestamp: { type: Date, default: Date.now },
  totalFetched: Number,
  totalImported: Number,
  newJobs: Number,
  updatedJobs: Number,
  failedJobs: [
    {
      guid: String,
      reason: String,
    }
  ],
}, { timestamps: true });

export default mongoose.models.ImportLog || mongoose.model('ImportLog', ImportLogSchema);
