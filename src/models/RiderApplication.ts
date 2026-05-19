import mongoose, { Schema } from 'mongoose';
import { IRiderApplication } from '../types';
import { generatePublicId } from '../utils/generateId';

const RiderApplicationSchema = new Schema<IRiderApplication>(
  {
    publicId: { type: String, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    matricNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    photo: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
    submittedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

RiderApplicationSchema.pre('save', function () {
  if (this.isNew) {
    this.publicId = generatePublicId('PR');
  }
});

export default mongoose.model<IRiderApplication>('RiderApplication', RiderApplicationSchema);
