import mongoose from 'mongoose';

const territorySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  markerLat: { type: Number },
  markerLng: { type: Number },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  challengeExpiresAt: { type: Date, default: null },
  capturedAt: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.model('Territory', territorySchema);
