import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';
import { generatePublicId } from '../utils/generateId';

const UserSchema = new Schema<IUser>(
  {
    publicId: { type: String, unique: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, trim: true },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  if (this.isNew) {
    this.publicId = generatePublicId('usr');
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
