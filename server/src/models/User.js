import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.methods.toPublicJSON = function () {
  return { id: this.id, name: this.name, email: this.email, isDemo: this.isDemo };
};

export default mongoose.model('User', userSchema);
