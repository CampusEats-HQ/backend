import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IRider } from '../types';
import { generatePublicId } from '../utils/generateId';

const RiderSchema = new Schema<IRider>(
  {
    publicId: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    matricNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    photo: { type: String },
    rating: { type: Number, default: 5.0 },
    totalDeliveries: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

RiderSchema.pre('save', async function () {
  if (this.isNew) {
    this.publicId = generatePublicId('R');
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

RiderSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IRider>('Rider', RiderSchema);
