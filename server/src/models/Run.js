import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  timestamp: { type: Number, required: true },
}, { _id: false });

const runSchema = new mongoose.Schema({
  runner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  routeHash: { type: String, required: true, unique: true, select: false },
  status: { type: String, enum: ['processing', 'completed'], default: 'processing', index: true },
  points: { type: [pointSchema], required: true, select: false },
  distanceMeters: { type: Number, required: true },
  durationSeconds: { type: Number, required: true },
  claimedCount: { type: Number, default: 0 },
  contestedCount: { type: Number, default: 0 },
  capturedCount: { type: Number, default: 0 },
  defendedCount: { type: Number, default: 0 },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('Run', runSchema);
