import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  guid: { type: String, index: true, unique: true, required: true },
  title: String,
  link: String,
  description: String,
  company: String,
  location: String,
  category: String,
  pubDate: Date,
  raw: mongoose.Schema.Types.Mixed, // keep raw feed data
}, { timestamps: true });

export default mongoose.models.Job || mongoose.model('Job', JobSchema);
