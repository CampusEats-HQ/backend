import mongoose, { Schema } from 'mongoose';
import { IOTP } from '../types';

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, lowercase: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['verification', 'reset'], required: true },
  expiresAt: { type: Date, required: true },
});

OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOTP>('OTP', OTPSchema);
